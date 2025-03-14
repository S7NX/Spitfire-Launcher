<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import { nonNull } from '$lib/utils';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import Accordion from '$components/ui/Accordion.svelte';
  import { doingBulkOperations } from '$lib/stores.js';
  import MCPManager from '$lib/core/managers/mcp';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  type XPStatuses = Array<{
    accountId: string;
    displayName: string;
    xp?: {
      battleRoyale: number;
      creative: number;
      saveTheWorld: number;
    };
    error?: string;
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let xpStatuses = $state<XPStatuses>([]);

  async function fetchXPData() {
    isFetching = true;
    doingBulkOperations.set(true);

    const accounts = selectedAccounts.map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId)).filter(x => !!x);
    await Promise.all(accounts.map(async (account) => {
      const status = xpStatuses.find((status) => status.accountId === account.accountId) || { accountId: account.accountId, displayName: account.displayName, xp: {} as any };
      if (!xpStatuses.includes(status)) xpStatuses = [...xpStatuses, status];

      const [athenaProfile, campaignProfile] = await Promise.all([
        MCPManager.queryProfile(account, 'athena').catch(() => null),
        MCPManager.queryProfile(account, 'campaign').catch(() => null)
      ]);

      if (athenaProfile) {
        const attributes = athenaProfile.profileChanges[0].profile.stats.attributes;
        status.xp.creative = attributes.creative_dynamic_xp?.currentWeekXp || 0;
        status.xp.battleRoyale = attributes.playtime_xp?.currentWeekXp || 0;
      }

      if (campaignProfile) {
        const items = Object.values(campaignProfile.profileChanges[0].profile.items);
        const xpItem = items.find((item) => item.templateId === 'Token:stw_accolade_tracker');
        if (xpItem) {
          status.xp.saveTheWorld = xpItem.attributes?.weekly_xp || 0;
        }
      }
    }));

    doingBulkOperations.set(false);
    selectedAccounts = [];
    isFetching = false;
  }
</script>

<CenteredPageContent>
  <div class="flex flex-col gap-y-2">
    <h2 class="text-lg font-medium">Earned XP</h2>

    <p class="text-sm text-muted-foreground">
      Check your XP progress from Battle Royale, Creative and Save the World
    </p>
  </div>

  <AccountSelect disabled={isFetching} type="multiple" bind:selected={selectedAccounts}/>

  <Button
    class="flex justify-center items-center gap-x-2 mt-2"
    disabled={!selectedAccounts?.length || isFetching}
    onclick={fetchXPData}
    variant="epic"
  >
    {#if isFetching}
      <LoaderCircleIcon class="size-6 animate-spin"/>
      Loading XP information
    {:else}
      Check XP Progress
    {/if}
  </Button>

  {#if !isFetching && xpStatuses.length}
    <div class="mt-2 w-full max-w-2xl">
      <h3 class="text-base font-medium mb-3">XP Information</h3>

      <Accordion items={xpStatuses} type="multiple">
        {#snippet trigger(status)}
          <div class="flex items-center justify-between px-2 h-10 w-full bg-muted-foreground/5 rounded-sm">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="font-medium truncate min-w-fit shrink-0">{status.displayName}</span>
            </div>

            <span class="hover:bg-muted-foreground/10 inline-flex size-8 items-center justify-center bg-transparent shrink-0 ml-1">
              <ChevronDownIcon class="size-5 transition-transform duration-200"/>
            </span>
          </div>
        {/snippet}

        {#snippet content(status)}
          {@const gamemodes = [
            {
              name: 'Battle Royale',
              value: status.xp?.battleRoyale || 0,
              limit: 4_000_000
            },
            {
              name: 'Creative',
              value: status.xp?.creative || 0,
              limit: 4_000_000
            },
            {
              name: 'Save the World',
              value: status.xp?.saveTheWorld || 0,
              limit: 4_000_000
            }
          ]}

          <div class="overflow-hidden text-sm mt-1 bg-muted-foreground/5 p-2">
            {#each gamemodes as gamemode (gamemode.name)}
              <div class="flex items-center gap-1 py-1 truncate">
                <span class="font-medium">{gamemode.name}:</span>
                <span>{gamemode.value.toLocaleString()}/{gamemode.limit.toLocaleString()}</span>
                <img class="size-4" alt="XP Icon" src="/assets/brxp.png"/>
              </div>
            {/each}
          </div>
        {/snippet}
      </Accordion>
    </div>
  {/if}
</CenteredPageContent>