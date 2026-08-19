<script lang="ts">
  import { Dialog } from "bits-ui";
  import { X } from "@lucide/svelte";
  import IconButton from "./ui/IconButton.svelte";
  import Switch from "./ui/Switch.svelte";
  import { ACCENTS, accentId } from "../lib/theme";

  let {
    open = $bindable(false),
    autoScroll = $bindable(true),
    onClose = () => {},
  }: {
    open?: boolean;
    autoScroll?: boolean;
    onClose?: () => void;
  } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-content" aria-describedby={undefined}>
      <div class="dialog-header">
        <Dialog.Title class="dialog-title">Settings</Dialog.Title>
        <Dialog.Close>
          <IconButton title="Close"><X size={16} /></IconButton>
        </Dialog.Close>
      </div>
      <div class="dialog-body">
        <div class="setting-row">
          <span>
            <span class="setting-label">Theme Accent</span>
            <span class="setting-sub">Color used for selection highlights and active states.</span>
          </span>
          <div class="accent-row">
            {#each ACCENTS as a (a.id)}
              <button
                class="accent-swatch"
                class:active={$accentId === a.id}
                style="background:{a.color};color:{a.color}"
                title={a.name}
                onclick={() => accentId.set(a.id)}
              ></button>
            {/each}
          </div>
        </div>
        <label class="setting-row">
          <span>
            <span class="setting-label">Auto-scroll during playback</span>
            <span class="setting-sub">Follow the playhead as the song plays.</span>
          </span>
          <Switch bind:checked={autoScroll} ariaLabel="Auto-scroll during playback" />
        </label>
        <p class="hint">
          Tip: scroll the piano roll with the wheel, hold <kbd>Shift</kbd> to scroll
          horizontally, or <kbd>Ctrl</kbd>/<kbd>⌘</kbd> to zoom. Right-click a note to edit its
          pitch bend.
        </p>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .setting-label {
    display: block;
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
  }
  .setting-sub {
    display: block;
    font-size: 11px;
    color: var(--text-faint);
    margin-top: 2px;
  }
  .hint {
    margin: 18px 0 0;
    font-size: 11px;
    color: var(--text-faint);
    line-height: 1.6;
  }
  .hint kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--bg-3);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    padding: 1px 5px;
    color: var(--text);
  }
  .accent-row {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .accent-swatch {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid var(--border-strong);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }
  .accent-swatch:hover {
    transform: scale(1.08);
    border-color: var(--text);
  }
  .accent-swatch.active {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--bg-1), 0 0 0 4px currentColor;
  }
</style>
