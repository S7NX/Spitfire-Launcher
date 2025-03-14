<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import { accountsStore, doingBulkOperations } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import Accordion from '$components/ui/Accordion.svelte';
  import ChevronDownIcon from 'lucide-svelte/icons/chevron-down';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import MCPManager from '$lib/core/managers/mcp';
  import { dailyQuests } from '$lib/constants/stw/resources';
  import type { FullQueryProfile } from '$types/game/mcp';
  import InfoIcon from 'lucide-svelte/icons/info';

  type DailyQuest = {
    id: string;
    name: string;
    completionProgress: number;
    limit: number;
    rewards: {
      gold: number;
      mtx: number;
      xp: number;
    }
  };

  type QuestStatuses = Array<{
    accountId: string;
    displayName: string;
    hasFounder: boolean;
    quests: DailyQuest[];
  }>;

  let selectedAccounts = $state<string[]>([]);
  let isFetching = $state(false);
  let canReroll = $state(false);
  let questStatuses = $state<QuestStatuses>([]);
  let rerollingQuestId = $state<string | null>(null);

  async function fetchDailyQuests() {
    isFetching = true;
    doingBulkOperations.set(true);
    questStatuses = [];

    const accounts = selectedAccounts
      .map((accountId) => $accountsStore.allAccounts.find((account) => account.accountId === accountId))
      .filter(x => !!x);

    await Promise.all(accounts.map(async (account) => {
      const status = {
        accountId: account.accountId,
        displayName: account.displayName,
        hasFounder: false,
        quests: []
      };

      try {
        const campaignProfile = await MCPManager.queryProfile(account, 'campaign');
        handleQueryProfile(campaignProfile, status);

        if (status.quests.length > 0) {
          questStatuses = [...questStatuses, status];
        }
      } catch (error) {
        console.error(`Failed to fetch quests for ${account.displayName}:`, error);
      }
    }));

    selectedAccounts = [];
    doingBulkOperations.set(false);
    isFetching = false;
  }

  function handleQueryProfile(queryProfile: FullQueryProfile<'campaign'>, status: QuestStatuses[number]) {
    const profile = queryProfile.profileChanges[0].profile;
    const items = profile.items;

    canReroll = (profile.stats.attributes.quest_manager?.dailyQuestRerolls || 0) > 0;
    status.quests = [];
    status.hasFounder = Object.values(items).some((item) => item.templateId === 'Token:receivemtxcurrency');

    const dailyQuestsItems = Object.entries(items)
      .filter(([, item]) => item.templateId.startsWith('Quest:') && item.attributes.quest_state === 'Active')
      .map(([id, item]) => ({ id, ...item }));

    for (const item of dailyQuestsItems) {
      const quest = dailyQuests[item.templateId.split(':')[1].toLowerCase()];
      if (!quest) continue;

      const completionKey = Object.keys(item.attributes).find((attr) => attr.includes('completion'))!;
      const completion = item.attributes[completionKey] || 0;

      status.quests.push({
        id: item.id,
        name: quest.name,
        completionProgress: completion,
        limit: quest.limit,
        rewards: quest.rewards
      });
    }
  }

  async function rerollQuest(accountId: string, questId: string) {
    rerollingQuestId = questId;

    const account = $accountsStore.allAccounts.find((account) => account.accountId === accountId);
    if (!account) {
      rerollingQuestId = null;
      return;
    }

    try {
      const rerollResponse = await MCPManager.queryProfile(account, 'campaign');
      const status = questStatuses.find((status) => status.accountId === accountId);
      if (status) {
        handleQueryProfile(rerollResponse, status);
      }
    } catch (error) {
      console.error('Failed to reroll quest:', error);
    } finally {
      rerollingQuestId = null;
    }
  }
</script>

<CenteredPageContent>
  <h2 class="text-lg font-medium">Daily Quests</h2>

  <AccountSelect
    disabled={isFetching}
    type="multiple"
    bind:selected={selectedAccounts}
  />

  <Button
    class="flex justify-center items-center gap-x-2 w-full"
    disabled={!selectedAccounts?.length || isFetching}
    onclick={fetchDailyQuests}
    type="submit"
    variant="epic"
  >
    {#if isFetching}
      <LoaderCircleIcon class="size-6 animate-spin"/>
      <span>Fetching Quests</span>
    {:else}
      <span>Fetch Daily Quests</span>
    {/if}
  </Button>

  {#if !isFetching && questStatuses.length}
    <div class="space-y-4">
      <Accordion class="border rounded-lg " items={questStatuses} type="multiple">
        {#snippet trigger(account)}
          <div class="flex items-center justify-between px-4 py-3 bg-muted">
            <div class="flex items-center gap-3">
              <span class="font-semibold truncate">{account.displayName}</span>
              <div class="text-xs bg-muted-foreground/20 px-2 py-0.5 rounded-full">
                {account.quests.length} {account.quests.length === 1 ? 'quest' : 'quests'}
              </div>
            </div>

            <span class="hover:bg-muted-foreground/10 flex size-8 items-center justify-center rounded-full">
              <ChevronDownIcon class="size-5 transition-transform duration-200"/>
            </span>
          </div>
        {/snippet}

        {#snippet content(account)}
          <div class="p-4 bg-muted/30 space-y-3">
            {#each account.quests as quest (quest.id)}
              {@const rewards = [
                {
                  name: 'Gold',
                  icon: '/assets/resources/eventcurrency_scaling.png',
                  amount: quest.rewards.gold
                },
                {
                  name: account.hasFounder ? 'V-Bucks' : 'X-Ray Tickets',
                  icon: '/assets/resources/currency_mtxswap.png',
                  amount: quest.rewards.mtx
                },
                {
                  name: 'XP',
                  icon: '/assets/brxp.png',
                  amount: quest.rewards.xp
                }
              ]}

              <div class="bg-background border rounded-md p-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h3 class="text-sm font-medium">{quest.name}</h3>

                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{quest.completionProgress}/{quest.limit}</span>

                    {#if canReroll}
                      <Button
                        class="flex items-center justify-center h-8 w-8"
                        disabled={!!rerollingQuestId}
                        onclick={() => rerollQuest(account.accountId, quest.id)}
                        size="sm"
                        variant="outline"
                      >
                        <RefreshCwIcon class="size-4 {rerollingQuestId === quest.id ? 'animate-spin' : ''}"/>
                      </Button>
                    {/if}
                  </div>
                </div>

                <div class="flex justify-around">
                  {#each rewards as reward (reward.name)}
                    {#if reward.amount > 0}
                      <div class="flex items-center gap-2 bg-muted/50 p-2 rounded">
                        <img class="size-5" alt={reward.name} src={reward.icon}/>
                        <span class="text-sm font-medium">{reward.amount.toLocaleString()}</span>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/snippet}
      </Accordion>
    </div>
  {/if}
</CenteredPageContent>