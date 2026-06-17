<script lang="ts">
  import { X } from "@lucide/svelte";

  let {
    open = false,
    autoScroll = $bindable(true),
    onClose = () => {},
  }: {
    open?: boolean;
    autoScroll?: boolean;
    onClose?: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="overlay" onclick={onClose} onkeydown={(e) => e.key === "Enter" && onClose()} role="presentation">
    <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-label="Settings" tabindex="-1">
      <div class="header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={onClose}><X size={16} /></button>
      </div>
      <div class="body">
        <label class="setting">
          <span class="setting-label">Auto-scroll during playback</span>
          <input type="checkbox" bind:checked={autoScroll} />
        </label>
        <p class="hint">When enabled, the piano roll scrolls to follow playback position.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .panel {
    background: #1a1a2e;
    border: 1px solid #444;
    border-radius: 6px;
    width: 340px;
    max-width: 90vw;
    color: #ddd;
    font-family: monospace;
    font-size: 13px;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #333;
  }
  .header h2 {
    margin: 0;
    font-size: 14px;
    color: #4fc3f7;
  }
  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }
  .close-btn:hover {
    background: #2a2a4e;
    color: #fff;
  }
  .body {
    padding: 16px;
  }
  .setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .setting-label {
    font-size: 12px;
    color: #ccc;
  }
  input[type="checkbox"] {
    accent-color: #4fc3f7;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  .hint {
    margin: 0;
    font-size: 11px;
    color: #666;
    line-height: 1.4;
  }
</style>
