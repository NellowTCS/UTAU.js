<script lang="ts">
  import { Select } from "bits-ui";
  let {
    value = $bindable<string | undefined>(undefined),
    options = [],
    placeholder = "Select",
    ariaLabel = "",
  }: {
    value?: string | undefined;
    options: { value: string; label: string }[];
    placeholder?: string;
    ariaLabel?: string;
  } = $props();
</script>

<Select.Root type="single" bind:value>
  <Select.Trigger class="select-trigger" aria-label={ariaLabel}>
    <Select.Value placeholder={placeholder} />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content sideOffset={6} class="select-content">
      <Select.Viewport class="select-viewport">
        {#each options as o (o.value)}
          <Select.Item value={o.value} label={o.label} class="select-item">
            <Select.ItemText>{o.label}</Select.ItemText>
          </Select.Item>
        {/each}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
