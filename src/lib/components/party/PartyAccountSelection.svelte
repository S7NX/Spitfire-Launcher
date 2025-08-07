<script lang="ts">
  import AccountCombobox from '$components/ui/Combobox/AccountCombobox.svelte';
  import Button from '$components/ui/Button.svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    type: 'single' | 'multiple';
    selected: string | string[];
    disabled?: boolean;
    loading?: boolean;
    onclick?: () => void;
    children: Snippet;
  };

  let {
    type,
    selected = $bindable(),
    disabled,
    loading,
    onclick,
    children
  }: Props = $props();

</script>

<div class="flex gap-2">
  <AccountCombobox
    class="grow shrink min-w-0"
    type={type as any}
    bind:selected={selected as any}
  />

  <Button
    class="shrink-0"
    {disabled}
    {loading}
    {onclick}
    variant="epic"
  >
    {@render children()}
  </Button>
</div>