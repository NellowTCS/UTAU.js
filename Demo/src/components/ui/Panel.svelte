<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    title = "",
    children,
    class: cls = "",
  }: {
    title?: string;
    children: Snippet;
    class?: string;
  } = $props();
</script>

<section class="panel {cls}">
  {#if title}
    <h3 class="panel-title">{title}</h3>
  {/if}
  <div class="panel-body">
    {@render children()}
  </div>
</section>
