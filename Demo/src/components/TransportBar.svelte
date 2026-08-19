<script lang="ts">
  import { Play, Pause, Square, FileDown, FileOutput, Metronome } from "@lucide/svelte";
  import Button from "./ui/Button.svelte";
  import Slider from "./ui/Slider.svelte";

  let {
    onPlay = () => {},
    onPause = () => {},
    onStop = () => {},
    onResume = () => {},
    onExport = () => {},
    onScoreExport = () => {},
    exporting = false,
    buffering = false,
    bufferAhead = 0,
    state = "idle",
    volume = $bindable(0.8),
    tempo = $bindable(120),
    playheadTick = null,
    totalTicks = 0,
  }: {
    onPlay?: () => void;
    onPlayAlias?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onResume?: () => void;
    onExport?: () => void;
    onScoreExport?: () => void;
    exporting?: boolean;
    buffering?: boolean;
    bufferAhead?: number;
    state?: string;
    volume?: number;
    tempo?: number;
    playheadTick?: number | null;
    totalTicks?: number;
  } = $props();

  const RES = 480;
  function fmt(ticks: number): string {
    const sec = ticks / ((tempo / 60) * RES);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function handlePrimary() {
    if (state === "playing") onPause();
    else if (state === "paused") onResume();
    else onPlay();
  }
  let statusClass = $derived(
    buffering ? "buffering" : state === "playing" ? "playing" : state === "paused" ? "paused" : "",
  );
  let statusText = $derived(
    buffering
      ? "Buffering"
      : state === "playing" && bufferAhead < 0.2
        ? "Underrun"
        : state === "idle"
          ? "Ready"
          : state === "playing"
            ? "Playing"
            : "Paused",
  );
</script>

<div class="transport">
  <Button
    variant="primary"
    class="play-btn"
    onclick={handlePrimary}
    title={state === "playing" ? "Pause" : "Play"}
  >
    {#if state === "playing"}
      <Pause size={18} />
    {:else}
      <Play size={18} />
    {/if}
  </Button>
  <Button variant="ghost" class="play-btn" onclick={onStop} disabled={state === "idle"} title="Stop">
    <Square size={15} />
  </Button>

  <div class="time-readout">
    <span class="cur">{playheadTick != null ? fmt(playheadTick) : "0:00"}</span>
    <span class="sep">/</span>
    <span>{fmt(totalTicks)}</span>
  </div>

  <div class="vol-group">
    <span class="ctl-label">Vol</span>
    <Slider bind:value={volume} min={0} max={1} step={0.01} ariaLabel="Volume" />
  </div>

  <div class="bpm-group">
    <Metronome size={15} />
    <Slider bind:value={tempo} min={40} max={240} step={1} ariaLabel="Tempo" />
    <input class="bpm-input" type="number" min="40" max="240" bind:value={tempo} />
  </div>

  <div class="header-spacer"></div>

  <span class="status-pill {statusClass}">
    <span class="led"></span>{statusText}
  </span>

  <Button variant="subtle" onclick={onExport} disabled={exporting} title="Export WAV">
    {#if exporting}
      <span class="dots">···</span>
    {:else}
      <FileDown size={16} />
    {/if}
  </Button>
  <Button variant="subtle" onclick={onScoreExport} title="Export project (.ustx)">
    <FileOutput size={16} />
  </Button>
</div>

<style>
  .transport {
    height: var(--transport-h);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: 0 var(--sp-4);
    background: var(--bg-1);
    border-top: 1px solid var(--border);
    z-index: 30;
  }
  .play-btn {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    padding: 0;
  }
  .time-readout {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 92px;
  }
  .time-readout .sep {
    color: var(--text-faint);
  }
  .time-readout .cur {
    color: var(--text);
  }
  .vol-group,
  .bpm-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ctl-label {
    font-size: 11px;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .bpm-input {
    width: 48px;
    background: var(--bg-inset);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-xs);
    padding: 4px 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    text-align: center;
  }
  .bpm-input:focus {
    outline: none;
    border-color: var(--accent-line);
  }
  .dots {
    letter-spacing: 1px;
  }
</style>
