<script lang="ts">
  import type { Note } from "utaujs"

  let { notes = $bindable([]), selectedNote = $bindable<number | null>(null), ticksPerBeat = 480, beatsVisible = 8 } = $props()

  const MIN_NOTE = 48, MAX_NOTE = 84, NOTE_HEIGHT = 20, KEY_WIDTH = 50, BEAT_WIDTH = 120
  const NOTE_Y_OFFSET = 30
  const TOTAL_WIDTH = $derived(KEY_WIDTH + beatsVisible * BEAT_WIDTH)
  const TOTAL_HEIGHT = $derived((MAX_NOTE - MIN_NOTE + 1) * NOTE_HEIGHT + NOTE_Y_OFFSET)

  let canvas: HTMLCanvasElement | undefined
  let dragging: { type: string; startX: number; startY: number; origTick: number; origLen: number; origNote: number } | null = null

  function noteX(n: Note) { return KEY_WIDTH + ((n.tick ?? 0) / ticksPerBeat) * BEAT_WIDTH }
  function noteW(n: Note) { return (n.length / ticksPerBeat) * BEAT_WIDTH }
  function noteY(n: Note) { return NOTE_Y_OFFSET + (MAX_NOTE - n.noteNum) * NOTE_HEIGHT }

  function render() {
    const c = canvas
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    const scale = devicePixelRatio
    c.width = TOTAL_WIDTH * scale
    c.height = TOTAL_HEIGHT * scale
    ctx.scale(scale, scale)
    ctx.clearRect(0, 0, TOTAL_WIDTH, TOTAL_HEIGHT)
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, TOTAL_WIDTH, TOTAL_HEIGHT)

    for (let n = MIN_NOTE; n <= MAX_NOTE; n++) {
      const y = NOTE_Y_OFFSET + (MAX_NOTE - n) * NOTE_HEIGHT
      const isBlack = [1, 3, 6, 8, 10].includes(n % 12)
      ctx.fillStyle = isBlack ? "#16213e" : "#1a1a2e"
      ctx.fillRect(0, y, TOTAL_WIDTH, NOTE_HEIGHT)
    }

    for (let beat = 0; beat <= beatsVisible; beat++) {
      const x = KEY_WIDTH + beat * BEAT_WIDTH
      ctx.strokeStyle = "#2a2a4e"; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, NOTE_Y_OFFSET); ctx.lineTo(x, TOTAL_HEIGHT); ctx.stroke()
      ctx.fillStyle = "#666"; ctx.font = "11px monospace"; ctx.textAlign = "center"
      ctx.fillText(`${beat + 1}`, x + BEAT_WIDTH / 2, 20)
    }

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    for (let n = MIN_NOTE; n <= MAX_NOTE; n++) {
      const y = NOTE_Y_OFFSET + (MAX_NOTE - n) * NOTE_HEIGHT
      ctx.fillStyle = "#555"; ctx.font = "10px monospace"; ctx.textAlign = "right"
      ctx.fillText(`${noteNames[n % 12]}${Math.floor(n / 12) - 1}`, KEY_WIDTH - 6, y + NOTE_HEIGHT / 2 + 3)
    }

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i]; const x = noteX(n); const y = noteY(n); const w = Math.max(4, noteW(n))
      ctx.fillStyle = selectedNote === i ? "#00d2ff" : "#4fc3f7"
      ctx.shadowColor = selectedNote === i ? "#00d2ff" : "transparent"
      ctx.shadowBlur = selectedNote === i ? 8 : 0
      ctx.fillRect(x, y + 1, w, NOTE_HEIGHT - 2)
      ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.font = "10px sans-serif"
      if (w > 20) ctx.fillText(n.lyric, x + 4, y + NOTE_HEIGHT / 2 + 3)
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    if (mx < KEY_WIDTH || my < NOTE_Y_OFFSET) return

    const hitIdx = notes.findIndex((n: Note) => mx >= noteX(n) && mx <= noteX(n) + noteW(n) && my >= noteY(n) && my <= noteY(n) + NOTE_HEIGHT)

    if (hitIdx >= 0) {
      selectedNote = hitIdx
      const n = notes[hitIdx]
      dragging = { type: mx - noteX(n) >= noteW(n) - 10 ? "resize" : "move", startX: mx, startY: my, origTick: n.tick ?? 0, origLen: n.length, origNote: n.noteNum }
    } else {
      selectedNote = null
      const beat = (mx - KEY_WIDTH) / BEAT_WIDTH
      const tick = Math.round(beat * ticksPerBeat / 60) * 60
      const noteNum = MAX_NOTE - Math.floor((my - NOTE_Y_OFFSET) / NOTE_HEIGHT)
      if (noteNum >= MIN_NOTE && noteNum <= MAX_NOTE) {
        const nn: Note = { lyric: "a", noteNum, length: ticksPerBeat / 2, tick }
        notes.push(nn); selectedNote = notes.length - 1
        dragging = { type: "move", startX: mx, startY: my, origTick: tick, origLen: ticksPerBeat / 2, origNote: noteNum }
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || !canvas || selectedNote == null) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const n = notes[selectedNote]; if (!n) return

    if (dragging.type === "move") {
      const beatDx = Math.round(((mx - dragging.startX) / BEAT_WIDTH) * ticksPerBeat / 60) * 60
      const noteDy = -Math.round((my - dragging.startY) / NOTE_HEIGHT)
      n.tick = Math.max(0, dragging.origTick + beatDx)
      n.noteNum = Math.max(MIN_NOTE, Math.min(MAX_NOTE, dragging.origNote + noteDy))
    } else if (dragging.type === "resize") {
      const dx = mx - dragging.startX
      n.length = Math.max(ticksPerBeat / 8, dragging.origLen + Math.round(dx / BEAT_WIDTH * ticksPerBeat / 60) * 60)
    }
  }

  function handleMouseUp() { dragging = null }

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
    if ((e.key === "Delete" || e.key === "Backspace") && selectedNote != null) {
      notes.splice(selectedNote, 1); selectedNote = null
    }
  }

  $effect(() => { notes; selectedNote; render() })
</script>

<svelte:window onkeydown={handleKeyDown} />
<canvas bind:this={canvas} style="width:{TOTAL_WIDTH}px;height:{TOTAL_HEIGHT}px"
  onmousedown={handleMouseDown} onmousemove={handleMouseMove}
  onmouseup={handleMouseUp} onmouseleave={handleMouseUp} tabindex="0">
</canvas>
