<script lang="ts">
  import Select from '$components/ui/Select.svelte';
  import UserIcon from 'lucide-svelte/icons/user';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import { accountsStore } from '$lib/stores';
  import type { AccountData } from '$types/accounts';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    customList?: AccountData[];
    disabled?: boolean;
    class?: ClassValue;
  } & ({
    type: 'single';
    selected?: string;
  } | {
    type: 'multiple';
    selected?: string[];
  });

  let {
    customList,
    type = 'multiple',
    selected = $bindable(),
    disabled,
    class: className
  }: Props = $props();

  const accountList = $derived(customList || $accountsStore.allAccounts);
  const items = $derived(accountList.map((account) => ({
    value: account.accountId,
    label: account.displayName
  })));

  $effect(() => {
    if (!selected?.length) return;

    if (typeof selected === 'string') {
      const isValid = accountList.some(account => account.accountId === selected);
      if (!isValid) selected = undefined;
    }

    if (Array.isArray(selected)) {
      const filtered = selected.filter(accountId =>
        accountList.some(account => account.accountId === accountId)
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
    return accountList.find((account) => account.accountId === accountId)?.displayName;
  }
</script>

<Select disabled={disabled || !accountList.length} {items} triggerClass={className} {type} bind:value={selected as never}>
  {#snippet trigger()}
    <UserIcon class="text-muted-foreground size-5 mr-2"/>
    <span class="text-muted-foreground">{selectedAccounts}</span>
    <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
  {/snippet}
</Select>