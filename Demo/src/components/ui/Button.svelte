<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    variant = "subtle",
    size = "md",
    onclick,
    children,
    disabled = false,
    title = "",
    type = "button",
    class: cls = "",
  }: {
    variant?: "primary" | "subtle" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    disabled?: boolean;
    title?: string;
    type?: "button" | "submit";
    class?: string;
  } = $props();
</script>

<button {type} class="btn {variant} {size} {cls}" {disabled} {title} {onclick}>
  {@render children()}
</button>
