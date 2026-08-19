<script lang="ts">
  import Slider from "./Slider.svelte";
  import Tooltip from "./Tooltip.svelte";
  let {
    label,
    value = $bindable(0),
    min = 0,
    max = 1,
    step = 0.01,
    format = (v: number) => v.toFixed(2),
    hint = "",
    onChange,
  }: {
    label: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    format?: (v: number) => string;
    hint?: string;
    onChange?: (v: number) => void;
  } = $props();
</script>

<div class="vp-row">
  {#if hint}
    <Tooltip text={hint}>
      <span class="vp-label">{label}</span>
    </Tooltip>
  {:else}
    <span class="vp-label">{label}</span>
  {/if}
  <div class="vp-control">
    <Slider bind:value {min} {max} {step} ariaLabel={label} onChange={onChange} />
    <span class="vp-value">{format(value)}</span>
  </div>
</div>
