<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    children,
    tone = "default",
  }: {
    children: Snippet;
    tone?: "default" | "accent" | "good" | "warn" | "bad";
  } = $props();
</script>

<span class="badge {tone}">{@render children()}</span>
