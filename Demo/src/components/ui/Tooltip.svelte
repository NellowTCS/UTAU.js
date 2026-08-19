<script lang="ts">
  import { Tooltip } from "bits-ui";
  import type { Snippet } from "svelte";
  let {
    text = "",
    children,
    trigger,
    side = "top",
  }: {
    text?: string;
    children?: Snippet;
    trigger?: Snippet<[Record<string, unknown>]>;
    side?: "top" | "right" | "bottom" | "left";
  } = $props();
</script>

<Tooltip.Root>
  {#if trigger}
    <Tooltip.Trigger>
      {#snippet child({ props })}
        {@render trigger(props)}
      {/snippet}
    </Tooltip.Trigger>
  {:else}
    <Tooltip.Trigger>
      {@render children?.()}
    </Tooltip.Trigger>
  {/if}
  <Tooltip.Portal>
    <Tooltip.Content {side} sideOffset={7} class="tooltip">
      {text}
      <Tooltip.Arrow class="tooltip-arrow" />
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
