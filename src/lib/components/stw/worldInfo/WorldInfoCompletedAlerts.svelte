<script lang="ts">
  import WorldInfoSectionAccordion from '$components/stw/worldInfo/WorldInfoSectionAccordion.svelte';
  import { accountsStore, worldInfoCache } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import type { EpicAccountById, EpicAccountByName } from '$types/game/lookup';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import SearchIcon from 'lucide-svelte/icons/search';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import LookupManager from '$lib/core/managers/lookup';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import MCPManager from '$lib/core/managers/mcp';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let lookupData = $state<EpicAccountById | EpicAccountByName>();
  let stwData = $state<{
    commanderLevel: {
      current: number;
      pastMaximum: number;
    };
    claimedMissionAlertIds: Set<string>;
  }>();

  const claimedMisssionAlerts = $derived($worldInfoCache && stwData?.claimedMissionAlertIds.size &&
    $worldInfoCache.values().toArray()
      .flatMap((worldMissions) => worldMissions.values().toArray())
      .filter((mission) => mission.alert && stwData?.claimedMissionAlertIds.has(mission.alert.guid))
  );

  let searchQuery = $state<string>();
  let isLoading = $state(false);

  async function fetchCompletedAlerts(event: SubmitEvent) {
    event.preventDefault();

    if (!searchQuery?.trim()) {
      toast.error('Please enter a name or ID to search');
      return;
    }

    isLoading = true;

    lookupData = undefined;
    stwData = undefined;

    const isAccountId = searchQuery.length === 32;

    try {
      const internalLookupData: EpicAccountById | EpicAccountByName = isAccountId
        ? await LookupManager.fetchById(activeAccount, searchQuery)
        : await LookupManager.fetchByName(activeAccount, searchQuery);

      try {
        if (!internalLookupData.id) return;

        const queryPublicProfile = await MCPManager.queryPublicProfile(activeAccount, internalLookupData.id, 'campaign');
        const profile = queryPublicProfile.profileChanges[0].profile;
        const attributes = profile.stats.attributes;
        const doneMissionAlerts = attributes.mission_alert_redemption_record?.claimData
          ?.sort((a, b) => new Date(b.redemptionDateUtc).getTime() - new Date(a.redemptionDateUtc).getTime())
          .map((claimData) => claimData.missionAlertId) || [];

        stwData = {
          commanderLevel: {
            current: attributes.level,
            pastMaximum: attributes.rewards_claimed_post_max_level || 0
          },
          claimedMissionAlertIds: new Set(doneMissionAlerts)
        };

        lookupData = internalLookupData;
      } catch (error) {
        console.error(error);
        toast.error('Couldn\'t fetch STW data of the player. Their game stats are private.');
      }
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Player not found');
    } finally {
      isLoading = false;
    }
  }
</script>

<div>
  <form class="flex items-center gap-2 w-full" onsubmit={fetchCompletedAlerts}>
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
      { name: 'Name', value: lookupData.displayName, href: `https://fortnitedb.com/profile/${lookupData.id}` },
      {
        name: 'Commander level',
        value: stwData && `${stwData.commanderLevel.current} ${stwData.commanderLevel.pastMaximum ? `(+${stwData.commanderLevel.pastMaximum})` : ''}`
      },
      { name: 'Completed alerts', value: stwData?.claimedMissionAlertIds.size || 0 }
    ]}

    <div class="space-y-4 mt-4">
      <div class="text-sm">
        {#each kv as { name, value, href } (name)}
          {#if value != null}
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground">{name}:</span>
              {#if href}
                <a class="flex items-center gap-2 hover:underline" href={href} target="_blank">
                  {value}
                  <ExternalLinkIcon class="size-4"/>
                </a>
              {:else}
                <span>{value}</span>
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      {#if claimedMisssionAlerts && stwData}
        <WorldInfoSectionAccordion claimedMissionAlerts={stwData?.claimedMissionAlertIds} missions={claimedMisssionAlerts} showAlertClaimedBorder={false}/>
      {/if}
    </div>
  {/if}
</div>
