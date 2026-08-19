<script lang="ts">
  import { ToggleGroup } from "bits-ui";
  let {
    value = $bindable<string | undefined>(undefined),
    options = [],
    size = "md",
  }: {
    value?: string | undefined;
    options: { value: string; label: string }[];
    size?: "sm" | "md";
  } = $props();
</script>

<ToggleGroup.Root type="single" bind:value class="segmented {size}">
  {#each options as o (o.value)}
    <ToggleGroup.Item value={o.value} class="seg-item">{o.label}</ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
