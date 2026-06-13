<script lang="ts">
  let {
    onPlay = () => {}, onPause = () => {}, onStop = () => {}, onResume = () => {},
    onExport = () => {}, exporting = false,
    state = $bindable("idle"), volume = $bindable(0.8),
  }: {
    onPlay?: () => void; onPause?: () => void; onStop?: () => void; onResume?: () => void;
    onExport?: () => void; exporting?: boolean;
    state?: string; volume?: number;
  } = $props()

  function handlePrimary() {
    if (state === "playing") onPause()
    else if (state === "paused") onResume()
    else onPlay()
  }
</script>

<div class="transport">
  <button class="btn" onclick={handlePrimary}>
    {state === "playing" ? "⏸" : "▶"}
  </button>
  <button class="btn" onclick={onStop} disabled={state === "idle"}>⏹</button>
  <label class="vol-label">
    Vol
    <input type="range" min="0" max="1" step="0.01" bind:value={volume} class="vol-slider" />
    <span class="vol-val">{Math.round(volume * 100)}%</span>
  </label>
  <div class="spacer"></div>
  <span class="status">{state === "idle" ? "Ready" : state === "playing" ? "Playing" : "Paused"}</span>
  <button class="btn export" onclick={onExport} disabled={exporting}>
    {exporting ? "..." : "⬇"}
  </button>
</div>

<style>
  .transport { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #0f0f23; border-top: 1px solid #333; font-family: monospace; }
  .btn { width: 36px; height: 36px; border: 1px solid #555; background: #1a1a2e; color: #fff; font-size: 16px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .btn:hover:not(:disabled) { background: #2a2a4e; border-color: #4fc3f7; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .vol-label { display: flex; align-items: center; gap: 6px; color: #888; font-size: 11px; margin-left: 4px; }
  .vol-slider { width: 60px; height: 4px; accent-color: #4fc3f7; }
  .vol-val { color: #aaa; font-size: 10px; width: 32px; text-align: right; }
  .spacer { flex: 1; }
  .status { color: #888; font-size: 11px; margin-right: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .export { width: auto; padding: 0 12px; font-size: 14px; }
</style>
