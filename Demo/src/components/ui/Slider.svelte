<script lang="ts">
  import { Slider } from "bits-ui";

  let {
    value = $bindable(0),
    min = 0,
    max = 1,
    step = 0.01,
    disabled = false,
    ariaLabel = "",
    onChange,
  }: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    ariaLabel?: string;
    onChange?: (v: number) => void;
  } = $props();
</script>

<div class="slider">
  <Slider.Root
    type="single"
    bind:value
    {min}
    {max}
    {step}
    {disabled}
    aria-label={ariaLabel}
    class="slider-root"
    onValueChange={(v) => onChange?.(v as number)}
  >
    {#snippet children({ thumbItems })}
      <div class="slider-track">
        <Slider.Range class="slider-range" />
      </div>
      {#each thumbItems as thumb (thumb.index)}
        <Slider.Thumb class="slider-thumb" index={thumb.index} aria-label={ariaLabel} />
      {/each}
    {/snippet}
  </Slider.Root>
</div>
