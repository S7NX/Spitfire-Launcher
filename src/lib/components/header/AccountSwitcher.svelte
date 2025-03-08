<script lang="ts">
  import { page } from '$app/state';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import PlusIcon from 'lucide-svelte/icons/plus';
  import LogOutIcon from 'lucide-svelte/icons/log-out';
  import CheckIcon from 'lucide-svelte/icons/check';
  import Button from '$components/ui/Button.svelte';
  import Dropdown from '$components/ui/Dropdown.svelte';
  import { DropdownMenu } from 'bits-ui';
  import Account from '$lib/core/account';
  import type { AccountData } from '$types/accounts';
  import { cn } from '$lib/utils';
  import { accountsStore } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import LoginModal from '$components/auth/login/LoginModal.svelte';

  type PageState = {
    showLoginModal?: boolean;
  };

  const { allAccounts, activeAccount } = $derived($accountsStore);

  let dropdownOpen = $state(false);
  let searchTerm = $state<string>();
  let showLoginModal = $state(false);

  $effect(() => {
    showLoginModal = (page.state as PageState).showLoginModal || false;
  });

  const filteredAccounts = $derived(searchTerm
    ? allAccounts.filter(account => account.displayName.toLowerCase().includes(searchTerm!.toLowerCase()))
    : allAccounts);

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function changeAccounts(account: AccountData) {
    dropdownOpen = false;

    toast.promise(Account.changeActiveAccount(account.accountId), {
      loading: `Switching to ${account.displayName}...`,
      success: `Switched to ${account.displayName}`,
      error: (error) => {
        console.error(error);
        return `Failed to switch to ${account.displayName}`;
      }
    });
  }

  function addNewAccount() {
    showLoginModal = true;
  }

  async function logout() {
    const accountName = activeAccount!.displayName || activeAccount!.accountId;

    toast.promise(Account.logout(), {
      loading: `Logging out of ${accountName}...`,
      success: `Logged out of ${accountName}`,
      error: (error) => {
        console.error(error);
        return `Failed to logout of ${accountName}`;
      }
    });
  }

  function handleKeyPress(event: KeyboardEvent) {
    event.stopPropagation();

    if (event.key === 'Escape') {
      dropdownOpen = false;
    }
  }
</script>

<div class="relative">
  <Dropdown bind:open={dropdownOpen}>
    {#snippet trigger()}
      <Button
        class="border-input gap-2 h-10 border max-w-40 truncate inline-flex justify-center items-center"
        onclick={toggleDropdown}
        variant="accent"
      >
        <span>{activeAccount?.displayName || 'No account'}</span>
        <ChevronDownIcon class="size-5 transition-transform duration-200 {dropdownOpen ? 'rotate-180' : ''}"/>
      </Button>
    {/snippet}

    <div class="p-2">
      {#if allAccounts.length > 0}
        <input
          class="w-full px-3 py-2 text-sm rounded-md bg-input border-input focus:outline-none focus:ring-2 focus:ring-ring"
          onkeydown={handleKeyPress}
          onkeyup={handleKeyPress}
          placeholder="Search accounts..."
          type="text"
          bind:value={searchTerm}
        />
      {/if}

      {#if filteredAccounts.length > 0}
        <div class="py-2">
          {#each filteredAccounts as account (account.accountId)}
            <DropdownMenu.Item
              class={cn(
                'w-full text-left px-4 py-2 text-sm truncate rounded-md',
                'hover:bg-accent hover:text-accent-foreground hover:cursor-pointer transition-colors',
                'flex items-center'
              )}
              onclick={() => changeAccounts(account)}
            >
              {#if activeAccount?.accountId === account.accountId}
                <CheckIcon class="size-5 mr-2"/>
              {/if}

              <span class="truncate">{account.displayName}</span>
            </DropdownMenu.Item>
          {/each}
        </div>
      {/if}

      <div
        class="space-y-1 {allAccounts.length > 0 ? 'pt-2' : ''} {filteredAccounts.length > 0 ?
          'border-t border-border' : ''}">
        <DropdownMenu.Item
          class={cn(
            'w-full text-left px-3 py-2 text-sm rounded-md cursor-pointer',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
            'flex items-center'
          )}
          onclick={addNewAccount}
        >
          <PlusIcon class="size-4 mr-2"/>
          Add New Account
        </DropdownMenu.Item>

        {#if activeAccount}
          <DropdownMenu.Item
            class={cn(
              'w-full text-left px-3 py-2 text-sm rounded-md cursor-pointer',
              'hover:bg-destructive hover:text-destructive-foreground transition-colors',
              'flex items-center'
            )}
            onclick={logout}
          >
            <LogOutIcon class="size-4 mr-2"/>
            Logout
          </DropdownMenu.Item>
        {/if}
      </div>
    </div>
  </Dropdown>
</div>

<LoginModal bind:open={showLoginModal}/>