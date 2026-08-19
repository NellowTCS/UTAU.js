<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    onclick,
    children,
    disabled = false,
    title = "",
    active = false,
    class: cls = "",
  }: {
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    disabled?: boolean;
    title?: string;
    active?: boolean;
    class?: string;
  } = $props();
</script>

<button type="button" class="icon-btn {active ? "active" : ""} {cls}" {disabled} {title} {onclick}>
  {@render children()}
</button>
