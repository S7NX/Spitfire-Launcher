<script lang="ts">
  import Select from '$components/ui/Select.svelte';
  import UserIcon from 'lucide-svelte/icons/user';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import { accountsStore } from '$lib/stores';

  type Props = {
    type: 'single';
    selected?: string;
  } | {
    type: 'multiple';
    selected?: string[];
  };

  let {
    type = 'multiple',
    selected = $bindable()
  }: Props = $props();

  const { allAccounts } = $derived($accountsStore);
  const items = $derived(allAccounts.map((account) => ({
    value: account.accountId,
    label: account.displayName
  })));

  $effect(() => {
    if (!selected?.length) return;

    if (typeof selected === 'string') {
      const isValid = allAccounts.some(account => account.accountId === selected);
      if (!isValid) selected = undefined;
    }

    if (Array.isArray(selected)) {
      const filtered = selected.filter(accountId =>
        allAccounts.some(account => account.accountId === accountId)
      );

      if (filtered.length !== selected.length) {
        selected = filtered;
      }
    }
  });

  const selectedAccounts = $derived(!selected?.length
    ? `Select ${type === 'single' ? 'an account' : 'accounts'}`
    : type === 'single' ? (getAccountName(selected as string)) : `${selected.length} account${selected.length === 1 ? '' : 's'} selected`
  );

  function getAccountName(accountId: string) {
    return allAccounts.find((account) => account.accountId === accountId)?.displayName;
  }
</script>

<Select {items} {type} bind:value={selected as never}>
  {#snippet trigger()}
    <UserIcon class="text-muted-foreground size-5 mr-2"/>
    <span class="text-muted-foreground">{selectedAccounts}</span>
    <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
  {/snippet}
</Select>