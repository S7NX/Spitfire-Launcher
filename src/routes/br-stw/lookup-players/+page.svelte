<script lang="ts">
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import type { EpicAccountById, EpicAccountByName } from '$types/game/lookup';
  import SearchIcon from 'lucide-svelte/icons/search';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import LookupManager from '$lib/core/managers/lookup';
  import { toast } from 'svelte-sonner';
  import { nonNull } from '$lib/utils';
  import type { ProfileItem } from '$types/game/mcp';
  import MCPManager from '$lib/core/managers/mcp';
  import { FounderEditions } from '$lib/constants/stw/resources';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let lookupData = $state<EpicAccountById | EpicAccountByName>();
  let stwData = $state<{
    commanderLevel: {
      current: number;
      pastMaximum: number;
    };
    daysLoggedIn: number;
    collectionBookLevel: number;
    completedZones: number;
    founderEdition: string;
    xpBoosts: {
      boostedXp: number;
      boostAmount: number;
    }
  }>();

  let searchQuery = $state<string>();
  let isLoading = $state(false);

  async function lookupPlayer(event: SubmitEvent) {
    event.preventDefault();

    if (!searchQuery?.trim())
      return toast.error('Please enter a name or ID to search');

    isLoading = true;

    const isAccountId = searchQuery.length === 32;

    try {
      const internalLookupData: EpicAccountById | EpicAccountByName = isAccountId
        ? await LookupManager.fetchById(activeAccount, searchQuery)
        : await LookupManager.fetchByName(activeAccount, searchQuery);

      try {
        const queryPublicProfile = await MCPManager.queryPublicProfile(activeAccount, internalLookupData.id, 'campaign');
        const profile = queryPublicProfile.profileChanges[0].profile;
        const attributes = profile.stats.attributes;

        stwData = {
          commanderLevel: {
            current: attributes.level,
            pastMaximum: attributes.rewards_claimed_post_max_level || 0
          },
          daysLoggedIn: attributes.daily_rewards?.totalDaysLoggedIn || 0,
          collectionBookLevel: attributes.collection_book?.maxBookXpLevelAchieved || 0,
          completedZones: attributes.gameplay_stats?.find((stat) => stat.statName === 'zonescompleted')?.statValue || 0,
          founderEdition: getFounderEdition(Object.values(profile.items)),
          xpBoosts: getXPBoosts(Object.values(profile.items))
        };

        lookupData = internalLookupData;
      } catch (error) {
        console.error(error);
        toast.error('Couldn\'t fetch STW data of the player. Their game stats are private.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Player not found');
    } finally {
      isLoading = false;
    }
  }

  function getFounderEdition(items: ProfileItem[]) {
    const editions = Object.entries(FounderEditions);

    for (const [editionName, templateId] of editions) {
      const edition = items.find((item) => item.templateId === templateId);
      if (edition) return editionName;
    }

    return items.find((item) => item.templateId === 'Token:receivemtxcurrency') ? 'Founder' : 'Non-Founder';
  }

  function getXPBoosts(items: ProfileItem[]) {
    const boostedXp = items.find((item) => item.templateId === 'Token:xpboost')?.quantity || 0;
    const boostAmount = Math.round(boostedXp / 864191);
    return { boostedXp, boostAmount };
  }
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class="flex flex-col gap-2 w-96 p-5 border rounded-md">
    <form class="flex items-center gap-2 w-full" onsubmit={lookupPlayer}>
      <div class="grow">
        <Input
          disabled={isLoading}
          placeholder="Search by name or account ID"
          bind:value={searchQuery}
        />
      </div>

      <Button
        class="flex items-center justify-center size-9"
        disabled={isLoading || !searchQuery || searchQuery.length < 3}
        size="sm"
        type="submit"
        variant="epic"
      >
        {#if isLoading}
          <LoaderCircleIcon class="size-5 animate-spin"/>
        {:else}
          <SearchIcon class="size-5"/>
        {/if}
      </Button>
    </form>

    {#if lookupData}
      {@const kv = [
        { name: 'ID', value: lookupData.id },
        { name: 'Name', value: lookupData.displayName },
        {
          name: 'Commander level',
          value: stwData && `${stwData.commanderLevel.current} ${stwData.commanderLevel.pastMaximum ? `(+${stwData.commanderLevel.pastMaximum})` : ''}`
        },
        {
          name: 'Boosted XP',
          value: stwData && `${stwData.xpBoosts.boostedXp.toLocaleString()} (${stwData.xpBoosts.boostAmount} boost${stwData?.xpBoosts.boostAmount === 1 ? '' : 's'})`
        },
        { name: 'Days logged in', value: stwData?.daysLoggedIn },
        { name: 'Collection book level', value: stwData?.collectionBookLevel.toLocaleString() },
        { name: 'Completed zones', value: stwData?.completedZones.toLocaleString() },
        { name: 'Founder edition', value: stwData?.founderEdition }
      ]}

      <div class="mt-4 text-sm relative">
        {#each kv as { name, value } (name)}
          {#if value != null}
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground">{name}:</span>
              <span>{value}</span>
            </div>
          {/if}
        {/each}

        <Button
          class="absolute bottom-0 right-0 p-0"
          href="https://fortnitedb.com/profile/{lookupData.id}"
          variant="ghost"
        >
          <img
            class="size-12"
            alt="FortniteDB"
            src="/assets/fndb.png"
          />
        </Button>
      </div>
    {/if}
  </div>
</div>