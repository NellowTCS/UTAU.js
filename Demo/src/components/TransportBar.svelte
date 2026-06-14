<script lang="ts">
  import { Play, Pause, Square, FileDown, FileOutput, Metronome } from "@lucide/svelte";

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
    state = $bindable("idle"),
    volume = $bindable(0.8),
    tempo = $bindable(120),
  }: {
    onPlay?: () => void;
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
  } = $props();

  function handlePrimary() {
    if (state === "playing") onPause();
    else if (state === "paused") onResume();
    else onPlay();
  }
</script>

<div class="transport">
  <button class="btn" onclick={handlePrimary}>
    {#if state === "playing"}
      <Pause size={16} />
    {:else}
      <Play size={16} />
    {/if}
  </button>
  <button class="btn" onclick={onStop} disabled={state === "idle"}>
    <Square size={14} />
  </button>
  <label class="vol-label">
    Vol
    <input type="range" min="0" max="1" step="0.01" bind:value={volume} class="vol-slider" />
    <span class="vol-val">{Math.round(volume * 100)}%</span>
  </label>
  <label class="bpm-label">
    <Metronome size={14} />
    <input type="range" min="40" max="240" step="1" bind:value={tempo} class="bpm-slider" />
    <input type="number" min="40" max="240" bind:value={tempo} class="bpm-input" />
  </label>
  <div class="spacer"></div>
  <span class="status">
    {#if buffering}
      Buffering…
    {:else if state === "playing" && bufferAhead < 0.2}
      Underrun
    {:else if state === "idle"}
      Ready
    {:else if state === "playing"}
      Playing
    {:else}
      Paused
    {/if}
  </span>
  <button class="btn export" onclick={onExport} disabled={exporting}>
    {#if exporting}
      <span class="dots">...</span>
    {:else}
      <FileDown size={16} />
    {/if}
  </button>
  <button class="btn export" onclick={onScoreExport}>
    <FileOutput size={16} />
  </button>
</div>

<style>
  .transport {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #0f0f23;
    border-top: 1px solid #333;
    font-family: monospace;
  }
  .btn {
    width: 36px;
    height: 36px;
    border: 1px solid #555;
    background: #1a1a2e;
    color: #fff;
    font-size: 16px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn:hover:not(:disabled) {
    background: #2a2a4e;
    border-color: #4fc3f7;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .vol-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #888;
    font-size: 11px;
    margin-left: 4px;
  }
  .vol-slider {
    width: 60px;
    height: 4px;
    accent-color: #4fc3f7;
  }
  .vol-val {
    color: #aaa;
    font-size: 10px;
    width: 32px;
    text-align: right;
  }
  .spacer {
    flex: 1;
  }
  .status {
    color: #888;
    font-size: 11px;
    margin-right: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .export {
    width: auto;
    padding: 0 12px;
    font-size: 14px;
  }
  .bpm-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #4fc3f7;
    font-size: 11px;
    margin-left: 8px;
  }
  .bpm-slider {
    width: 60px;
    height: 4px;
    accent-color: #4fc3f7;
  }
  .bpm-input {
    width: 40px;
    background: #0f0f23;
    color: #ddd;
    border: 1px solid #555;
    padding: 2px 4px;
    font-family: monospace;
    font-size: 11px;
    text-align: center;
  }
</style>
