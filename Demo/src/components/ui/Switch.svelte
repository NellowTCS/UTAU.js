<script lang="ts">
  import { Switch } from "bits-ui";
  let {
    checked = $bindable(false),
    ariaLabel = "",
  }: {
    checked?: boolean;
    ariaLabel?: string;
  } = $props();
</script>

<Switch.Root bind:checked class="switch" aria-label={ariaLabel}>
  <Switch.Thumb class="switch-thumb" />
</Switch.Root>
