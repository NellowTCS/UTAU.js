<script lang="ts">
  import type { Note } from "utaujs";

  let {
    notes = $bindable([]),
    selectedNote = $bindable<number | null>(null),
    ticksPerBeat = 480,
    noteRangeMin = 0,
    noteRangeMax = 127,
  } = $props();

  const NOTE_HEIGHT = 20,
    KEY_WIDTH = 50,
    BEAT_WIDTH = 120,
    NOTE_Y_OFFSET = 30;

  const maxTick = $derived(notes.reduce((m, n) => Math.max(m, (n.tick ?? 0) + n.length), 0));
  const contentBeats = $derived(maxTick > 0 ? Math.ceil(maxTick / ticksPerBeat) + 4 : 16);
  const contentWidth = $derived(KEY_WIDTH + contentBeats * BEAT_WIDTH);
  const totalHeight = $derived((noteRangeMax - noteRangeMin + 1) * NOTE_HEIGHT + NOTE_Y_OFFSET);

  let canvas: HTMLCanvasElement | undefined;
  let viewW = 0;
  let scrollX = 0;
  let scrollY = 0;

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  function noteX(n: Note) {
    return KEY_WIDTH + ((n.tick ?? 0) / ticksPerBeat) * BEAT_WIDTH;
  }
  function noteW(n: Note) {
    return (n.length / ticksPerBeat) * BEAT_WIDTH;
  }
  function noteY(n: Note) {
    return NOTE_Y_OFFSET + (noteRangeMax - n.noteNum) * NOTE_HEIGHT;
  }

  const PB_RADIUS = 5;

  function pbPointPos(n: Note, pi: number): { x: number; y: number } {
    const pb = n.pitchBend!;
    return {
      x: noteX(n) + (pb.ticks[pi] / n.length) * noteW(n),
      y: noteY(n) + NOTE_HEIGHT / 2 - pb.values[pi] * NOTE_HEIGHT,
    };
  }

  function findPitchPoint(n: Note, mx: number, my: number): number {
    if (!n.pitchBend) return -1;
    for (let i = 0; i < n.pitchBend.ticks.length; i++) {
      const p = pbPointPos(n, i);
      const dx = mx - p.x,
        dy = my - p.y;
      if (dx * dx + dy * dy <= PB_RADIUS * PB_RADIUS * 4) return i;
    }
    return -1;
  }

  function addPitchPoint(n: Note, mx: number, my: number) {
    const relTick = ((mx - noteX(n)) / noteW(n)) * n.length;
    const relVal = (noteY(n) + NOTE_HEIGHT / 2 - my) / NOTE_HEIGHT;
    const tick = Math.max(0, Math.min(n.length, Math.round(relTick)));
    const val = Math.max(-12, Math.min(12, Math.round(relVal * 10) / 10));
    if (!n.pitchBend) {
      n.pitchBend = { ticks: [tick], values: [val] };
      return;
    }
    const pb = n.pitchBend;
    let insIdx = pb.ticks.length;
    for (let i = 0; i < pb.ticks.length; i++) {
      if (pb.ticks[i] === tick) return;
      if (pb.ticks[i] > tick) {
        insIdx = i;
        break;
      }
    }
    pb.ticks.splice(insIdx, 0, tick);
    pb.values.splice(insIdx, 0, val);
  }

  function render() {
    const c = canvas;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    viewW = c.clientWidth;
    const viewH = c.clientHeight;
    if (viewW < 1 || viewH < 1) return;
    const scale = devicePixelRatio;
    const bufW = Math.ceil(viewW * scale);
    const bufH = Math.ceil(viewH * scale);
    if (c.width !== bufW || c.height !== bufH) {
      c.width = bufW;
      c.height = bufH;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, viewW, viewH);

    for (let n = noteRangeMin; n <= noteRangeMax; n++) {
      const y = NOTE_Y_OFFSET + (noteRangeMax - n) * NOTE_HEIGHT - scrollY;
      if (y + NOTE_HEIGHT < 0 || y > viewH) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n % 12);
      ctx.fillStyle = isBlack ? "#16213e" : "#1a1a2e";
      ctx.fillRect(0, y, viewW, NOTE_HEIGHT);
    }

    const firstBeat = Math.max(0, Math.floor((scrollX - BEAT_WIDTH) / BEAT_WIDTH));
    const lastBeat = Math.ceil((scrollX + viewW + BEAT_WIDTH) / BEAT_WIDTH);
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = KEY_WIDTH + beat * BEAT_WIDTH - scrollX;
      ctx.strokeStyle = "#2a2a4e";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewH);
      ctx.stroke();
      ctx.fillStyle = "#666";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${beat + 1}`, x + BEAT_WIDTH / 2, 20);
    }

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const nx = noteX(n);
      if (nx + noteW(n) < scrollX || nx > scrollX + viewW) continue;
      const y = noteY(n) - scrollY;
      if (y + NOTE_HEIGHT < 0 || y > viewH) continue;
      const x = nx - scrollX;
      const ww = Math.max(4, noteW(n));
      ctx.fillStyle = selectedNote === i ? "#00d2ff" : "#4fc3f7";
      ctx.shadowColor = selectedNote === i ? "#00d2ff" : "transparent";
      ctx.shadowBlur = selectedNote === i ? 8 : 0;
      ctx.fillRect(x, y + 1, ww, NOTE_HEIGHT - 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      if (ww > 20) ctx.fillText(n.lyric, x + 4, y + NOTE_HEIGHT / 2 + 3);
      if (n.pitchBend && n.pitchBend.ticks.length > 0 && n.length > 0) {
        const pb = n.pitchBend;
        ctx.save();
        ctx.beginPath();
        for (let pi = 0; pi < pb.ticks.length; pi++) {
          const px = x + (pb.ticks[pi] / n.length) * ww;
          const py = y + NOTE_HEIGHT / 2 - pb.values[pi] * NOTE_HEIGHT;
          pi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#ffdd44";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (selectedNote === i) {
          for (let pi = 0; pi < pb.ticks.length; pi++) {
            const px = x + (pb.ticks[pi] / n.length) * ww;
            const py = y + NOTE_HEIGHT / 2 - pb.values[pi] * NOTE_HEIGHT;
            ctx.beginPath();
            ctx.arc(px, py, PB_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = activePoint === pi ? "#fff" : "#ffdd44";
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }

    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(0, 0, Math.min(KEY_WIDTH, viewW), viewH);
    for (let n = noteRangeMin; n <= noteRangeMax; n++) {
      const y = NOTE_Y_OFFSET + (noteRangeMax - n) * NOTE_HEIGHT - scrollY;
      if (y + NOTE_HEIGHT < 0 || y > viewH) continue;
      ctx.fillStyle = "#555";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${noteNames[n % 12]}${Math.floor(n / 12) - 1}`, Math.min(KEY_WIDTH - 6, viewW - 6), y + NOTE_HEIGHT / 2 + 3);
    }
  }

  function clientToScore(mx: number, my: number): { x: number; y: number } {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: mx - rect.left + scrollX, y: my - rect.top + scrollY };
  }

  let activePoint = $state(-1);

  function handleMouseDown(e: MouseEvent) {
    const { x: mx, y: my } = clientToScore(e.clientX, e.clientY);
    if (my < NOTE_Y_OFFSET || mx < KEY_WIDTH) return;

    if (selectedNote != null && e.button === 2) {
      const n = notes[selectedNote];
      if (n) {
        const pi = findPitchPoint(n, mx, my);
        if (pi >= 0) {
          n.pitchBend!.ticks.splice(pi, 1);
          n.pitchBend!.values.splice(pi, 1);
          if (n.pitchBend!.ticks.length === 0) n.pitchBend = undefined;
          activePoint = -1;
          render();
          return;
        }
      }
    }

    if (selectedNote != null) {
      const n = notes[selectedNote];
      if (n) {
        const resizeZone = mx >= noteX(n) + noteW(n) - 10 && mx <= noteX(n) + noteW(n) && my >= noteY(n) && my <= noteY(n) + NOTE_HEIGHT;
        if (resizeZone) {
          activePoint = -1;
          dragging = {
            type: "resize",
            startX: mx,
            startY: my,
            origTick: n.tick ?? 0,
            origLen: n.length,
            origNote: n.noteNum,
          };
          return;
        }
      }
    }

    if (selectedNote != null) {
      const n = notes[selectedNote];
      if (n && mx >= noteX(n) && mx <= noteX(n) + noteW(n) && my >= noteY(n) - NOTE_HEIGHT * 3 && my <= noteY(n) + NOTE_HEIGHT * 4) {
        if (n.pitchBend) {
          const pi = findPitchPoint(n, mx, my);
          if (pi >= 0) {
            activePoint = pi;
            dragging = {
              type: "pitch-point",
              index: pi,
              startX: mx,
              startY: my,
              origTick: n.pitchBend.ticks[pi],
              origVal: n.pitchBend.values[pi],
              origNote: 0,
              origLen: 0,
            };
            return;
          }
        }
        addPitchPoint(n, mx, my);
        const pi2 = findPitchPoint(n, mx, my);
        if (pi2 >= 0) {
          activePoint = pi2;
          dragging = {
            type: "pitch-point",
            index: pi2,
            startX: mx,
            startY: my,
            origTick: n.pitchBend!.ticks[pi2],
            origVal: n.pitchBend!.values[pi2],
            origNote: 0,
            origLen: 0,
          };
        }
        render();
        return;
      }
    }

    const hitIdx = notes.findIndex(
      (n: Note) => mx >= noteX(n) && mx <= noteX(n) + noteW(n) && my >= noteY(n) && my <= noteY(n) + NOTE_HEIGHT,
    );

    if (hitIdx >= 0) {
      selectedNote = hitIdx;
      activePoint = -1;
      const n = notes[hitIdx];
      const dragStart = mx - noteX(n);
      dragging = {
        type: dragStart >= noteW(n) - 10 ? "resize" : "move",
        startX: mx,
        startY: my,
        origTick: n.tick ?? 0,
        origLen: n.length,
        origNote: n.noteNum,
      };
    } else {
      selectedNote = null;
      activePoint = -1;
      const beat = (mx - KEY_WIDTH) / BEAT_WIDTH;
      const tick = Math.round((beat * ticksPerBeat) / 60) * 60;
      const noteNum = noteRangeMax - Math.floor((my - NOTE_Y_OFFSET) / NOTE_HEIGHT);
      if (noteNum >= 0 && noteNum <= 127) {
        const nn: Note = {
          lyric: "a",
          noteNum,
          length: ticksPerBeat / 2,
          tick,
        };
        notes.push(nn);
        selectedNote = notes.length - 1;
        dragging = {
          type: "move",
          startX: mx,
          startY: my,
          origTick: tick,
          origLen: ticksPerBeat / 2,
          origNote: noteNum,
        };
      }
    }
  }

  let dragging: {
    type: string;
    index?: number;
    startX: number;
    startY: number;
    origTick: number;
    origLen: number;
    origNote: number;
    origVal?: number;
  } | null = null;

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || !canvas || selectedNote == null) return;
    const { x: mx, y: my } = clientToScore(e.clientX, e.clientY);
    const n = notes[selectedNote];
    if (!n) return;

    if (dragging.type === "pitch-point" && n.pitchBend) {
      const pi = dragging.index!;
      const tick = Math.max(0, Math.min(n.length, Math.round(((mx - noteX(n)) / noteW(n)) * n.length)));
      const val = Math.max(-12, Math.min(12, Math.round(((noteY(n) + NOTE_HEIGHT / 2 - my) / NOTE_HEIGHT) * 10) / 10));
      n.pitchBend.ticks[pi] = tick;
      n.pitchBend.values[pi] = val;
      render();
    } else if (dragging.type === "move") {
      const beatDx = Math.round((((mx - dragging.startX) / BEAT_WIDTH) * ticksPerBeat) / 60) * 60;
      n.tick = Math.max(0, dragging.origTick + beatDx);
      n.noteNum = Math.max(0, Math.min(127, dragging.origNote - Math.round((my - dragging.startY) / NOTE_HEIGHT)));
      render();
    } else if (dragging.type === "resize") {
      n.length = Math.max(
        ticksPerBeat / 8,
        dragging.origLen + Math.round((((mx - dragging.startX) / BEAT_WIDTH) * ticksPerBeat) / 60) * 60,
      );
      render();
    }
  }

  function handleMouseUp() {
    dragging = null;
    activePoint = -1;
    render();
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if ((e.key === "Delete" || e.key === "Backspace") && selectedNote != null) {
      notes.splice(selectedNote, 1);
      selectedNote = null;
    }
  }

  function handleWheel(e: WheelEvent) {
    if (e.shiftKey || Math.abs(e.deltaX) > 0) {
      scrollX = Math.max(0, Math.min(contentWidth - viewW, scrollX + e.deltaX + (e.shiftKey ? e.deltaY : 0)));
    } else {
      scrollY = Math.max(0, Math.min(totalHeight - viewH(), scrollY + e.deltaY));
    }
    render();
    e.preventDefault();
  }

  function viewH(): number {
    return canvas ? canvas.clientHeight : 200;
  }

  function scrollToNotes() {
    if (!notes.length || !canvas) return;
    const ticks = notes.map((n) => (n.tick ?? 0) + n.length / 2);
    const midTick = (Math.min(...ticks) + Math.max(...ticks)) / 2;
    const midNote = (Math.min(...notes.map((n) => n.noteNum)) + Math.max(...notes.map((n) => n.noteNum))) / 2;

    scrollX = Math.max(
      0,
      Math.min(contentWidth - canvas.clientWidth, KEY_WIDTH + (midTick / ticksPerBeat) * BEAT_WIDTH - canvas.clientWidth / 2),
    );
    scrollY = Math.max(
      0,
      Math.min(totalHeight - canvas.clientHeight, NOTE_Y_OFFSET + (noteRangeMax - midNote) * NOTE_HEIGHT - canvas.clientHeight / 2),
    );
    render();
  }

  let prevLen = 0;
  $effect(() => {
    notes;
    selectedNote;
    render();
    const len = notes.length;
    if (len && len > prevLen) {
      prevLen = len;
      requestAnimationFrame(() => scrollToNotes());
    }
    if (len === 0) prevLen = 0;
  });
</script>

<svelte:window onkeydown={handleKeyDown} />
<div class="piano-scroll">
  <canvas
    bind:this={canvas}
    class="piano-canvas"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
    onwheel={handleWheel}
    oncontextmenu={handleContextMenu}
    tabindex="0"
  >
  </canvas>
</div>

<style>
  .piano-scroll {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }
  .piano-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
