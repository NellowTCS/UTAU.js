<script lang="ts">
  import type { Note } from "ichikara";
  import { ZoomIn, ZoomOut, Piano, Magnet } from "@lucide/svelte";
  import IconButton from "./ui/IconButton.svelte";
  import Segmented from "./ui/Segmented.svelte";

  let {
    notes = $bindable([]),
    selectedNote = $bindable<number | null>(null),
    playheadTick = $bindable<number | null>(null),
    autoScroll = $bindable(true),
    ticksPerBeat = 480,
    noteRangeMin = 36,
    noteRangeMax = 96,
    saveSnapshot = () => {},
    handleUndo = () => {},
    handleRedo = () => {},
  }: {
    notes?: Note[];
    selectedNote?: number | null;
    playheadTick?: number | null;
    autoScroll?: boolean;
    ticksPerBeat?: number;
    noteRangeMin?: number;
    noteRangeMax?: number;
    saveSnapshot?: () => void;
    handleUndo?: () => void;
    handleRedo?: () => void;
  } = $props();

  const KEY_WIDTH = 52;
  const NOTE_Y_OFFSET = 28;
  let pxPerBeat = $state(120);
  let noteHeight = $state(20);
  let showKeyboard = $state(true);
  let snap = $state("1/8");

  const SNAP: Record<string, number> = { off: 1, "1/1": 480, "1/2": 240, "1/4": 120, "1/8": 60 };
  function snapTick(t: number): number {
    const s = SNAP[snap] ?? 1;
    return Math.round(t / s) * s;
  }

  const maxTick = $derived(
    notes.reduce((m, n) => Math.max(m, (n.tick ?? 0) + n.length), 0),
  );
  const contentBeats = $derived(maxTick > 0 ? Math.ceil(maxTick / ticksPerBeat) + 4 : 16);
  const contentWidth = $derived(KEY_WIDTH + contentBeats * pxPerBeat);
  const totalHeight = $derived((noteRangeMax - noteRangeMin + 1) * noteHeight + NOTE_Y_OFFSET);

  let notesCanvas: HTMLCanvasElement | undefined;
  let overlayCanvas: HTMLCanvasElement | undefined;
  let bgCache: OffscreenCanvas | null = null;
  let bgCacheKey = "";
  let viewW = $state(0);
  let scrollX = $state(0);
  let scrollY = $state(0);

  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  function noteX(n: Note) {
    return KEY_WIDTH + ((n.tick ?? 0) / ticksPerBeat) * pxPerBeat;
  }
  function noteW(n: Note) {
    return (n.length / ticksPerBeat) * pxPerBeat;
  }
  function noteY(n: Note) {
    return NOTE_Y_OFFSET + (noteRangeMax - n.noteNum) * noteHeight;
  }
  function xToTick(x: number) {
    return ((x - KEY_WIDTH + scrollX) / pxPerBeat) * ticksPerBeat;
  }
  function yToNote(y: number) {
    return noteRangeMax - Math.floor((y - NOTE_Y_OFFSET + scrollY) / noteHeight);
  }
  type ThemeColors = {
    accent: string;
    accentLight: string;
    accentDark: string;
    accentInk: string;
    bg0: string;
    rowBlack: string;
    rowWhite: string;
    gridMeasure: string;
    gridBeat: string;
    noteLyric: string;
    pitchBend: string;
    rulerBg: string;
    rulerText: string;
    rulerTextStrong: string;
    keyBlack: string;
    keyWhite: string;
    keyLabel: string;
    keySeparator: string;
  };
  function readThemeColors(): ThemeColors {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    const accent = v("--accent", "#2dd4bf");
    return {
      accent,
      accentLight: lighten(accent, 0.16),
      accentDark: darken(accent, 0.18),
      accentInk: accentInk(accent),
      bg0: v("--canvas-bg", "#0a0a0d"),
      rowBlack: v("--canvas-row-black", "#0d0d18"),
      rowWhite: v("--canvas-row-white", "#10101c"),
      gridMeasure: v("--grid-measure", "rgba(255,255,255,0.10)"),
      gridBeat: v("--grid-beat", "rgba(255,255,255,0.045)"),
      noteLyric: v("--note-lyric", "rgba(255,255,255,0.92)"),
      pitchBend: v("--pitch-bend", "#ffdd44"),
      rulerBg: v("--ruler-bg", "rgba(8,8,16,0.92)"),
      rulerText: v("--ruler-text", "#5a607a"),
      rulerTextStrong: v("--ruler-text-strong", "#9aa0b8"),
      keyBlack: v("--key-black", "#23232f"),
      keyWhite: v("--key-white", "#e9e9f2"),
      keyLabel: v("--key-label", "#5a607a"),
      keySeparator: v("--key-separator", "rgba(255,255,255,0.12)"),
    };
  }
  function mixHex(hex: string, target: [number, number, number], t: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const mr = Math.round(r + (target[0] - r) * t);
    const mg = Math.round(g + (target[1] - g) * t);
    const mb = Math.round(b + (target[2] - b) * t);
    return `rgb(${mr}, ${mg}, ${mb})`;
  }
  function lighten(hex: string, t: number): string {
    return mixHex(hex, [255, 255, 255], t);
  }
  function darken(hex: string, t: number): string {
    return mixHex(hex, [0, 0, 0], t);
  }
  function accentInk(hex: string): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#10100f" : "#f6f7fb";
  }
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function resize(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w < 1 || h < 1) return null;
    const scale = devicePixelRatio || 1;
    const bw = Math.ceil(w * scale);
    const bh = Math.ceil(h * scale);
    if (c.width !== c.clientWidth * scale) {
      c.width = bw;
      c.height = bh;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    viewW = w;
    return ctx;
  }

  function renderBackground(tc: ThemeColors) {
    const c = notesCanvas;
    if (!c) return;
    const ctx = resize(c);
    if (!ctx) return;
    const viewH = c.clientHeight;

    // Cache key: viewport dimensions + scroll + zoom + keyboard state
    const key = `${viewW}x${viewH}x${scrollX}x${scrollY}x${pxPerBeat}x${noteHeight}x${showKeyboard}x${tc.bg0}x${tc.rowBlack}x${tc.rowWhite}x${tc.gridMeasure}x${tc.rulerBg}`;
    if (bgCache && bgCacheKey === key) {
      ctx.drawImage(bgCache, 0, 0);
      return;
    }

    // Regenerate cache
    const oc = new OffscreenCanvas(viewW, viewH);
    const octx = oc.getContext("2d")!;
    octx.fillStyle = tc.bg0;
    octx.fillRect(0, 0, viewW, viewH);

    // note rows
    for (let n = noteRangeMin; n <= noteRangeMax; n++) {
      const y = NOTE_Y_OFFSET + (noteRangeMax - n) * noteHeight - scrollY;
      if (y + noteHeight < 0 || y > viewH) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(n % 12);
      octx.fillStyle = isBlack ? tc.rowBlack : tc.rowWhite;
      octx.fillRect(KEY_WIDTH, y, viewW - KEY_WIDTH, noteHeight);
    }

    // grid: beats + measures (assume 4/4)
    const firstBeat = Math.max(0, Math.floor((scrollX - pxPerBeat) / pxPerBeat));
    const lastBeat = Math.ceil((scrollX + viewW + pxPerBeat) / pxPerBeat);
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = KEY_WIDTH + beat * pxPerBeat - scrollX;
      const isMeasure = beat % 4 === 0;
      octx.strokeStyle = isMeasure ? tc.gridMeasure : tc.gridBeat;
      octx.lineWidth = 1;
      octx.beginPath();
      octx.moveTo(x, NOTE_Y_OFFSET);
      octx.lineTo(x, viewH);
      octx.stroke();
    }

    // top ruler
    octx.fillStyle = tc.rulerBg;
    octx.fillRect(0, 0, viewW, NOTE_Y_OFFSET);
    octx.fillStyle = tc.rulerText;
    octx.font = "10px ui-monospace, monospace";
    octx.textAlign = "center";
    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = KEY_WIDTH + beat * pxPerBeat - scrollX;
      if (beat % 4 === 0) {
        octx.fillStyle = tc.rulerTextStrong;
        octx.fillText(`${beat / 4 + 1}`, x + pxPerBeat / 2, 18);
      }
    }

    // keyboard
    if (showKeyboard) {
      octx.fillStyle = tc.bg0;
      octx.fillRect(0, 0, KEY_WIDTH, viewH);
      for (let n = noteRangeMin; n <= noteRangeMax; n++) {
        const y = NOTE_Y_OFFSET + (noteRangeMax - n) * noteHeight - scrollY;
        if (y + noteHeight < 0 || y > viewH) continue;
        const isBlack = [1, 3, 6, 8, 10].includes(n % 12);
        if (isBlack) {
          octx.fillStyle = tc.keyBlack;
          octx.fillRect(0, y, KEY_WIDTH, noteHeight);
        } else {
          octx.fillStyle = tc.keyWhite;
          octx.fillRect(0, y, KEY_WIDTH - 6, noteHeight);
          octx.fillStyle = tc.keyLabel;
          octx.font = "9px ui-monospace, monospace";
          octx.textAlign = "left";
          if (n % 12 === 0) octx.fillText(`C${Math.floor(n / 12) - 1}`, 3, y + noteHeight / 2 + 3);
        }
      }
      octx.strokeStyle = tc.keySeparator;
      octx.beginPath();
      octx.moveTo(KEY_WIDTH, 0);
      octx.lineTo(KEY_WIDTH, viewH);
      octx.stroke();
    }

    bgCache = oc;
    bgCacheKey = key;
    ctx.drawImage(bgCache, 0, 0);
  }

  function renderNotes() {
    const c = notesCanvas;
    if (!c) return;
    const ctx = resize(c);
    if (!ctx) return;
    const viewH = c.clientHeight;
    const tc = readThemeColors();

    // Draw cached background (grid, rows, keyboard, ruler)
    renderBackground(tc);

    // notes
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const nx = noteX(n);
      if (nx + noteW(n) < scrollX || nx > scrollX + viewW) continue;
      const y = noteY(n) - scrollY;
      if (y + noteHeight < 0 || y > viewH) continue;
      const x = nx - scrollX;
      const ww = Math.max(6, noteW(n));
      const vel = n.velocity ?? 100;
      const alpha = 0.42 + (Math.max(0, Math.min(127, vel)) / 127) * 0.5;
      const selected = selectedNote === i;
      const grad = ctx.createLinearGradient(0, y, 0, y + noteHeight);
      grad.addColorStop(0, tc.accentLight);
      grad.addColorStop(1, tc.accentDark);
      ctx.globalAlpha = selected ? 1 : alpha;
      ctx.fillStyle = grad;
      roundRect(ctx, x + 1, y + 1, ww - 2, noteHeight - 2, 2);
      ctx.fill();
      if (selected) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = tc.accentInk;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = selected ? tc.accentInk : tc.noteLyric;
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "left";
      if (ww > 22) ctx.fillText(n.lyric, x + 5, y + noteHeight / 2 + 3);
    }

    // pitch bend (selected note)
    if (selectedNote != null && notes[selectedNote]?.pitchBend) {
      const n = notes[selectedNote];
      const y = noteY(n) - scrollY;
      const x = noteX(n) - scrollX;
      const ww = Math.max(6, noteW(n));
      const pb = n.pitchBend!;
      ctx.beginPath();
      for (let pi = 0; pi < pb.ticks.length; pi++) {
        const px = x + (pb.ticks[pi] / n.length) * ww;
        const py = y + noteHeight / 2 - pb.values[pi] * noteHeight;
        pi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = tc.pitchBend;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      for (let pi = 0; pi < pb.ticks.length; pi++) {
        const px = x + (pb.ticks[pi] / n.length) * ww;
        const py = y + noteHeight / 2 - pb.values[pi] * noteHeight;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = activePoint === pi ? "#fff" : tc.pitchBend;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  function renderOverlay() {
    const c = overlayCanvas;
    if (!c) return;
    const ctx = resize(c);
    if (!ctx) return;
    const viewH = c.clientHeight;
    ctx.clearRect(0, 0, viewW, viewH);
    if (playheadTick == null) return;
    const x = KEY_WIDTH + (playheadTick / ticksPerBeat) * pxPerBeat - scrollX;
    if (x < KEY_WIDTH - 2 || x > viewW) return;
    const tc = readThemeColors();
    ctx.strokeStyle = tc.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, NOTE_Y_OFFSET);
    ctx.lineTo(x, viewH);
    ctx.stroke();
    ctx.fillStyle = tc.accent;
    ctx.beginPath();
    ctx.moveTo(x - 5, NOTE_Y_OFFSET);
    ctx.lineTo(x + 5, NOTE_Y_OFFSET);
    ctx.lineTo(x, NOTE_Y_OFFSET + 7);
    ctx.closePath();
    ctx.fill();
  }

  function renderAll() {
    renderNotes();
    renderOverlay();
  }

  const PB_RADIUS = 5;
  function pbPointPos(n: Note, pi: number) {
    const x = noteX(n) + (n.pitchBend!.ticks[pi] / n.length) * noteW(n);
    const y = noteY(n) + noteHeight / 2 - n.pitchBend!.values[pi] * noteHeight;
    return { x, y };
  }
  function findPitchPoint(n: Note, mx: number, my: number): number {
    if (!n.pitchBend) return -1;
    for (let i = 0; i < n.pitchBend.ticks.length; i++) {
      const p = pbPointPos(n, i);
      const dx = mx - p.x;
      const dy = my - p.y;
      if (dx * dx + dy * dy <= PB_RADIUS * PB_RADIUS * 4) return i;
    }
    return -1;
  }
  function addPitchPoint(n: Note, mx: number, my: number) {
    const relTick = ((mx - noteX(n)) / noteW(n)) * n.length;
    const relVal = (noteY(n) + noteHeight / 2 - my) / noteHeight;
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

  function clientToScore(mx: number, my: number) {
    if (!notesCanvas) return { x: 0, y: 0 };
    const rect = notesCanvas.getBoundingClientRect();
    return { x: mx - rect.left + scrollX, y: my - rect.top + scrollY };
  }

  let activePoint = $state(-1);
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

  function handleMouseDown(e: MouseEvent) {
    const { x: mx, y: my } = clientToScore(e.clientX, e.clientY);
    // keyboard click
    if (showKeyboard && mx < KEY_WIDTH && my >= NOTE_Y_OFFSET) {
      const nn = yToNote(my);
      if (selectedNote != null && notes[selectedNote]) {
        notes[selectedNote].noteNum = nn;
        saveSnapshot();
        renderAll();
      }
      return;
    }
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
          saveSnapshot();
          renderAll();
          return;
        }
      }
    }

    if (selectedNote != null) {
      const n = notes[selectedNote];
      if (n) {
        const resizeZone =
          mx >= noteX(n) + noteW(n) - 10 &&
          mx <= noteX(n) + noteW(n) &&
          my >= noteY(n) &&
          my <= noteY(n) + noteHeight;
        if (resizeZone) {
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
      if (n && mx >= noteX(n) && mx <= noteX(n) + noteW(n) && my >= noteY(n) && my <= noteY(n) + noteHeight) {
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
        renderAll();
        return;
      }
    }

    const hitIdx = notes.findIndex(
      (n: Note) =>
        mx >= noteX(n) && mx <= noteX(n) + noteW(n) && my >= noteY(n) && my <= noteY(n) + noteHeight,
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
      const tick = snapTick(xToTick(mx));
      const noteNum = yToNote(my);
      if (noteNum >= noteRangeMin && noteNum <= noteRangeMax) {
        const nn: Note = {
          lyric: "a",
          noteNum,
          length: ticksPerBeat / 2,
          tick,
          velocity: 100,
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
        renderAll();
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || !notesCanvas || selectedNote == null) return;
    const { x: mx, y: my } = clientToScore(e.clientX, e.clientY);
    const n = notes[selectedNote];
    if (!n) return;
    if (dragging.type === "pitch-point" && n.pitchBend) {
      const pi = dragging.index!;
      const tick = Math.max(0, Math.min(n.length, Math.round(((mx - noteX(n)) / noteW(n)) * n.length)));
      const val = Math.max(-12, Math.min(12, Math.round(((noteY(n) + noteHeight / 2 - my) / noteHeight) * 10) / 10));
      n.pitchBend.ticks[pi] = tick;
      n.pitchBend.values[pi] = val;
      renderAll();
    } else if (dragging.type === "move") {
      const dx = ((mx - dragging.startX) / pxPerBeat) * ticksPerBeat;
      n.tick = Math.max(0, snapTick(dragging.origTick + dx));
      n.noteNum = Math.max(noteRangeMin, Math.min(noteRangeMax, dragging.origNote - Math.round((my - dragging.startY) / noteHeight)));
      renderAll();
    } else if (dragging.type === "resize") {
      const dx = ((mx - dragging.startX) / pxPerBeat) * ticksPerBeat;
      n.length = Math.max(ticksPerBeat / 8, snapTick(dragging.origLen + dx));
      renderAll();
    }
  }

  function handleMouseUp() {
    if (dragging) saveSnapshot();
    dragging = null;
    activePoint = -1;
    renderAll();
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  function handleKeyDown(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
    if ((e.key === "Delete" || e.key === "Backspace") && selectedNote != null) {
      saveSnapshot();
      notes.splice(selectedNote, 1);
      selectedNote = null;
      renderAll();
    }
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      pxPerBeat = Math.max(40, Math.min(360, pxPerBeat * factor));
      renderAll();
      return;
    }
    if (e.shiftKey || Math.abs(e.deltaX) > 0) {
      scrollX = Math.max(0, Math.min(contentWidth - viewW, scrollX + e.deltaX + (e.shiftKey ? e.deltaY : 0)));
    } else {
      scrollY = Math.max(0, Math.min(totalHeight - (notesCanvas?.clientHeight ?? 200), scrollY + e.deltaY));
    }
    renderAll();
    e.preventDefault();
  }

  function zoom(factor: number) {
    pxPerBeat = Math.max(40, Math.min(360, Math.round(pxPerBeat * factor)));
    renderAll();
  }

  function scrollToNotes() {
    if (!notes.length || !notesCanvas) return;
    const midTick = (Math.min(...notes.map((n) => n.tick ?? 0)) + Math.max(...notes.map((n) => (n.tick ?? 0) + n.length / 2))) / 2;
    const midNote = (Math.min(...notes.map((n) => n.noteNum)) + Math.max(...notes.map((n) => n.noteNum))) / 2;
    scrollX = Math.max(0, Math.min(contentWidth - notesCanvas.clientWidth, KEY_WIDTH + (midTick / ticksPerBeat) * pxPerBeat - notesCanvas.clientWidth / 2));
    scrollY = Math.max(0, Math.min(totalHeight - notesCanvas.clientHeight, NOTE_Y_OFFSET + (noteRangeMax - midNote) * noteHeight - notesCanvas.clientHeight / 2));
    renderAll();
  }

  let prevLen = 0;
  $effect(() => {
    notes;
    selectedNote;
    pxPerBeat;
    noteHeight;
    showKeyboard;
    renderNotes();
    const len = notes.length;
    if (len && len > prevLen) {
      prevLen = len;
      requestAnimationFrame(() => scrollToNotes());
    }
    if (len === 0) prevLen = 0;
  });

  $effect(() => {
    playheadTick;
    if (playheadTick != null && autoScroll) {
      const x = KEY_WIDTH + (playheadTick / ticksPerBeat) * pxPerBeat;
      const target = x - (notesCanvas?.clientWidth ?? 800) * 0.33;
      scrollX = Math.max(0, Math.min(contentWidth - (notesCanvas?.clientWidth ?? 800), target));
    }
    renderOverlay();
  });

  function onResize() {
    renderAll();
  }
</script>

<svelte:window onkeydown={handleKeyDown} onresize={onResize} />
<div class="piano-toolbar">
  <IconButton onclick={() => zoom(1 / 1.2)} title="Zoom out"><ZoomOut size={16} /></IconButton>
  <IconButton onclick={() => zoom(1.2)} title="Zoom in"><ZoomIn size={16} /></IconButton>
  <span class="zoom-readout">{pxPerBeat}px/b</span>
  <Segmented
    bind:value={snap}
    size="sm"
    options={[
      { value: "off", label: "Off" },
      { value: "1/1", label: "1/1" },
      { value: "1/2", label: "1/2" },
      { value: "1/4", label: "1/4" },
      { value: "1/8", label: "1/8" },
    ]}
  />
  <div class="spacer"></div>
  <IconButton active={showKeyboard} onclick={() => (showKeyboard = !showKeyboard)} title="Toggle keyboard">
    <Piano size={16} />
  </IconButton>
  <IconButton active={autoScroll} onclick={() => (autoScroll = !autoScroll)} title="Toggle auto-scroll">
    <Magnet size={16} />
  </IconButton>
</div>
<div class="piano-scroll" bind:clientWidth={viewW}>
  <canvas
    bind:this={notesCanvas}
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
  <canvas bind:this={overlayCanvas} class="piano-canvas" style="pointer-events:none"></canvas>
</div>

<style>
  .piano-toolbar {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
  }
  .piano-toolbar .spacer {
    flex: 1;
  }
  .zoom-readout {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-faint);
    min-width: 56px;
    text-align: right;
  }
  .piano-scroll {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg-inset);
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
