<script lang="ts">
  let {
    onPlay = () => {}, onPause = () => {}, onStop = () => {}, onResume = () => {},
    state = $bindable("idle"),
  }: {
    onPlay?: () => void; onPause?: () => void; onStop?: () => void; onResume?: () => void;
    state?: string;
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
  <span class="status">{state === "idle" ? "Ready" : state === "playing" ? "Playing" : "Paused"}</span>
</div>

<style>
  .transport { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #0f0f23; border-top: 1px solid #333; font-family: monospace; }
  .btn { width: 36px; height: 36px; border: 1px solid #555; background: #1a1a2e; color: #fff; font-size: 16px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
  .btn:hover:not(:disabled) { background: #2a2a4e; border-color: #4fc3f7; }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .status { color: #888; font-size: 11px; margin-left: 8px; text-transform: uppercase; letter-spacing: 1px; }
</style>
