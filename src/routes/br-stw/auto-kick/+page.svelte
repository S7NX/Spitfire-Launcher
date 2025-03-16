<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import Automation from '$lib/core/managers/automation/base';
  import { accountsStore, automationStore } from '$lib/stores';
  import { cn, nonNull } from '$lib/utils';
  import type { AutomationSetting } from '$types/settings';
  import Switch from '$components/ui/Switch.svelte';
  import Trash2Icon from 'lucide-svelte/icons/trash-2';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';

  const allAccounts = $derived(nonNull($accountsStore.allAccounts));
  const xmppDisabledAccounts = $derived(allAccounts.filter((x) => !$automationStore.some((y) => y.accountId === x.accountId)));

  let selectedAccountId = $state<string>();

  $effect(() => {
    if (!selectedAccountId) return;

    const isAlreadyAdded = $automationStore.some((a) => a.accountId === selectedAccountId);
    if (isAlreadyAdded) {
      selectedAccountId = undefined;
      return;
    }

    const account = allAccounts.find((a) => a.accountId === selectedAccountId)!;
    Automation.addAccount(account, {
      autoKick: true
    });

    selectedAccountId = undefined;
  });

  const settings = [
    {
      id: 'autoKick',
      label: 'Auto-Kick'
    },
    {
      id: 'autoClaim',
      label: 'Auto-Claim'
    },
    {
      id: 'autoTransferMaterials',
      label: 'Auto-Transfer Mats'
    }
  ] as const;

  async function changeSetting<T extends keyof Omit<AutomationSetting, 'accountId'>>(accountId: string, name: T, value: AutomationSetting[T]) {
    await Automation.updateSettings(accountId, { [name]: value });
  }
</script>

<CenteredPageContent class="min-w-128">
  <div class="contents text-muted-foreground text-sm">
    <h1 class="text-lg font-semibold text-primary -mb-2">Auto-Kick</h1>
    <p>
      Automation settings for your accounts. You can enable/disable auto-kick, auto-claim, and auto-transfer materials for Save the World missions.
    </p>

    <div class="flex items-center gap-x-6">
      <div class="flex items-center gap-x-2">
        <div class="size-2 rounded-full bg-green-500"></div>
        <span>Active</span>
      </div>

      <div class="flex items-center gap-x-2">
        <div class="size-2 rounded-full bg-red-500"></div>
        <span>Login Expired</span>
      </div>

      <div class="flex items-center gap-x-2">
        <div class="size-2 rounded-full bg-gray-500"></div>
        <span>Disconnected</span>
      </div>
    </div>

    <AccountSelect
      customList={xmppDisabledAccounts}
      type="single"
      bind:selected={selectedAccountId}
    />
  </div>

  {#if $automationStore.length}
    <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each $automationStore as automationAccount (automationAccount.accountId)}
        {@const isLoading = automationAccount.status === 'LOADING'}

        <div class="border rounded-lg shadow-sm overflow-hidden w-56">
          <div class="bg-muted p-4 flex items-center justify-between h-12">
            <div class="flex items-center gap-2">
              <div
                class={cn(
                  'size-2 rounded-full',
                  (automationAccount.status === 'DISCONNECTED' || automationAccount.status === 'LOADING') && 'bg-gray-500',
                  automationAccount.status === 'ACTIVE' && 'bg-green-500',
                  automationAccount.status === 'INVALID_CREDENTIALS' && 'bg-red-500'
                )}></div>
              <span class="font-medium">{allAccounts.find((a) => a.accountId === automationAccount.accountId)?.displayName || automationAccount.accountId}</span>
            </div>

            <Button
              class="flex items-center justify-center hover:bg-muted-foreground/50 hover:text-destructive size-8"
              disabled={isLoading}
              onclick={() => Automation.removeAccount(automationAccount.accountId)}
              size="sm"
              variant="ghost"
            >
              {#if isLoading}
                <RefreshCwIcon class="size-6 animate-spin opacity-50 !cursor-not-allowe}"/>
              {:else}
                <Trash2Icon class="size-4"/>
              {/if}
            </Button>
          </div>

          <div class="px-4 py-2 space-y-1">
            {#each settings as setting (setting.id)}
              <div class="flex items-center justify-between py-1.5">
                <span class="text-sm mr-5">{setting.label}</span>
                <Switch
                  checked={$automationStore.find((a) => a.accountId === automationAccount.accountId)?.[setting.id] ?? false}
                  disabled={isLoading}
                  onCheckedChange={(checked) => changeSetting(automationAccount.accountId, setting.id, checked)}
                />
              </div>

              {#if setting !== settings[settings.length - 1]}
                <div class="border-t"></div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</CenteredPageContent>