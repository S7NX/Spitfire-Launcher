<script lang="ts" module>
  let isKicking = $state<boolean>();
  let isLeaving = $state<boolean>();
  let isClaiming = $state<boolean>();
  let isDoingSomething = $derived(isKicking || isLeaving || isClaiming);
</script>

<script lang="ts">
  import AccountCombobox from '$components/auth/account/AccountCombobox.svelte';
  import Button from '$components/ui/Button.svelte';
  import { DropdownMenu } from '$components/ui/DropdownMenu';
  import Switch from '$components/ui/Switch.svelte';
  import Tabs from '$components/ui/Tabs.svelte';
  import { accountPartiesStore, accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils';
  import { Label, Separator } from 'bits-ui';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import LogOutIcon from 'lucide-svelte/icons/log-out';
  import UserXIcon from 'lucide-svelte/icons/user-x';
  import CrownIcon from 'lucide-svelte/icons/crown';
  import EllipsisIcon from 'lucide-svelte/icons/ellipsis';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import PartyManager from '$lib/core/managers/party';
  import { SvelteSet } from 'svelte/reactivity';
  import { toast } from 'svelte-sonner';
  import type { AccountData } from '$types/accounts';
  import RewardClaimer from '$lib/core/managers/automation/rewardClaimer';
  import AutoKickBase from '$lib/core/managers/automation/autoKickBase';

  const allAccounts = $derived(nonNull($accountsStore.allAccounts));
  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  $effect(() => {
    fetchPartyData(activeAccount);
  });

  type Party = {
    maxSize: number;
    region: string;
    createdAt: Date;
  };

  type PartyMember = {
    accountId: string;
    displayName: string;
    platformSpecificName?: string;
    avatarUrl: string;
    platform: string;
    ownsSaveTheWorld: boolean;
    isReady: boolean;
    isLeader: boolean;
    battlePassLevel: number;
    crownedWins: number;
    joinedAt: Date;
    loadout: Array<{
      type: string;
      icon: string;
    }>;
  };

  const currentAccountParty = $derived(accountPartiesStore.get(activeAccount.accountId));

  const partyData = $derived<Party | undefined>(currentAccountParty && {
    maxSize: currentAccountParty.config.max_size,
    region: currentAccountParty.meta['Default:RegionId_s'],
    createdAt: new Date(currentAccountParty.created_at)
  });
  const partyMembers = $derived<PartyMember[] | undefined>(currentAccountParty &&
    currentAccountParty.members
      .map(member => {
        const athenaCosmeticLoadout = JSON.parse(member.meta['Default:AthenaCosmeticLoadout_j'] || '{}')?.AthenaCosmeticLoadout;
        const getSmallIcon = (id?: string, splitWith = '.') => id ? `https://fortnite-api.com/images/cosmetics/br/${id.split(splitWith)[1]}/smallicon.png` : '';

        return {
          accountId: member.account_id,
          displayName: member.meta['urn:epic:member:dn_s'] || '???',
          platformSpecificName: member.connections[0].meta['account_pl_dn'],
          avatarUrl: getSmallIcon(athenaCosmeticLoadout?.characterPrimaryAssetId, ':'),
          platform: member.connections[0].meta['urn:epic:conn:platform_s'],
          ownsSaveTheWorld: JSON.parse(member.meta['Default:PackedState_j']?.replaceAll('True', 'true') || '{}')?.PackedState?.hasPurchasedSTW || false,
          isReady: JSON.parse(member.meta['Default:LobbyState_j'] || '{}')?.LobbyState?.gameReadiness === 'Ready',
          isLeader: member.role === 'CAPTAIN',
          battlePassLevel: JSON.parse(member.meta['Default:BattlePassInfo_j'] || '{}')?.BattlePassInfo?.passLevel || 1,
          crownedWins: athenaCosmeticLoadout?.cosmeticStats?.find((x: any) => x.statName === 'TotalRoyalRoyales')?.value || 0,
          joinedAt: new Date(member.joined_at),
          loadout: [
            { type: 'outfit', icon: getSmallIcon(athenaCosmeticLoadout?.characterPrimaryAssetId, ':') },
            { type: 'backpack', icon: getSmallIcon(athenaCosmeticLoadout?.backpackDef) },
            { type: 'pickaxe', icon: getSmallIcon(athenaCosmeticLoadout?.pickaxeDef) },
            { type: 'contrail', icon: getSmallIcon(athenaCosmeticLoadout?.contrailDef) }
          ].filter(x => !!x.icon)
        };
      })
      .sort((a, b) => {
        if (a.isLeader && !b.isLeader) return -1;
        if (!a.isLeader && b.isLeader) return 1;
        return b.joinedAt.getTime() - a.joinedAt.getTime();
      })
  );
  const partyLeaderAccount = $derived(allAccounts.find(account => partyMembers?.some(member => member.accountId === account.accountId && member.isLeader)));

  let shouldClaimRewards = $state<boolean>(false);
  let kickAllSelectedAccount = $state<string>();
  let leavePartySelectedAccounts = $state<string[]>();
  let claimRewardsPartySelectedAccounts = $state<string[]>();
  let kickingMemberIds = new SvelteSet<string>();
  let promotingMemberId = $state<string>();

  const tabs = $derived([
    { name: 'STW Actions', component: STWActions },
    { name: 'Party Members', component: PartyMembers, disabled: !partyData && !partyMembers?.length }
  ]);

  async function kickAll() {
    if (!kickAllSelectedAccount) return;

    isKicking = true;

    try {
      const kickerAccount = allAccounts.find((account) => account.accountId === kickAllSelectedAccount);
      if (!kickerAccount) return;

      const partyData = await fetchPartyData(kickerAccount);
      if (!partyData) {
        toast.error('You are not in a party');
        return;
      }

      const partyMemberIds = partyData.members.map(x => x.account_id).filter(id => id !== kickAllSelectedAccount);
      const partyLeaderId = partyData.members.find(x => x.role === 'CAPTAIN')!.account_id;
      if (partyLeaderId !== kickerAccount.accountId) {
        toast.error('You are not the party leader');
        return;
      }

      await Promise.allSettled(partyMemberIds.map(async (id) => {
        await kickMember(partyData.id, id, kickerAccount);
      }));

      await PartyManager.leave(kickerAccount, partyData.id);

      toast.success('Successfuly kicked everyone');
    } catch (error) {
      console.error(error);
      toast.error('Failed to kick everyone');
    } finally {
      kickAllSelectedAccount = undefined;
      isKicking = false;
    }
  }

  async function kickMember(partyId: string, memberId: string, kicker = partyLeaderAccount) {
    if (!kicker) return;

    kickingMemberIds.add(memberId);

    try {
      await PartyManager.kick(kicker, partyId, memberId);

      const account = allAccounts.find((account) => account.accountId === memberId);
      const isAutoClaimEnabled = AutoKickBase.getAccountById(memberId)?.settings.autoClaim || false;
      if (account && !isAutoClaimEnabled && shouldClaimRewards) await RewardClaimer.claimRewards(account, true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to kick member');
    } finally {
      kickingMemberIds.delete(memberId);
    }
  }

  async function leaveParty(claimOnly?: boolean, accountId?: string) {
    const selectedAccounts = accountId ? [accountId] : claimOnly ? claimRewardsPartySelectedAccounts : leavePartySelectedAccounts;
    if (!selectedAccounts?.length) return;

    if (claimOnly) {
      isClaiming = true;
    } else {
      isLeaving = true;
    }

    try {
      const accountParties = new Map<string, string>();
      const accounts = allAccounts.filter(account => selectedAccounts.includes(account.accountId));
      const registeredAccounts = allAccounts.map(account => account.accountId);

      for (const account of accounts) {
        if (accountParties.has(account.accountId)) continue;

        const party = await fetchPartyData(account);
        if (!party) continue;

        for (const member of party.members) {
          const isRegisteredAccount = registeredAccounts.includes(member.account_id);
          if (!isRegisteredAccount) continue;

          accountParties.set(member.account_id, party.id);
          accountPartiesStore.set(member.account_id, party);
        }
      }

      await Promise.allSettled(Array.from(accountParties).map(async ([accountId, partyId]) => {
        const account = allAccounts.find((account) => account.accountId === accountId)!;
        if (!claimOnly) await PartyManager.leave(account, partyId);

        const isAutoClaimEnabled = AutoKickBase.getAccountById(accountId)?.settings.autoClaim || false;
        if (claimOnly || (!isAutoClaimEnabled && shouldClaimRewards)) await RewardClaimer.claimRewards(account, true);
      }));

      toast.success(accountId
        ? 'Successfully left the party'
        : claimOnly ? 'Successfully claimed rewards' : 'Successfully left parties');
    } catch (error) {
      console.error(error);
      toast.error(claimOnly ? 'Failed to claim rewards' : 'Failed to leave party');
    } finally {
      if (claimOnly) {
        isClaiming = false;
        claimRewardsPartySelectedAccounts = [];
      } else {
        isLeaving = false;
        leavePartySelectedAccounts = [];
      }
    }
  }

  async function fetchPartyData(account: AccountData) {
    const cache = accountPartiesStore.get(account.accountId);
    if (cache) return cache;

    const partyResponse = await PartyManager.get(account);
    const party = partyResponse?.current[0];
    if (!party) return;

    return party;
  }

  async function promote(memberId: string) {
    promotingMemberId = memberId;

    try {
      const member = partyMembers?.find(member => member.accountId === memberId);
      if (!member) return;

      await PartyManager.promote(partyLeaderAccount!, currentAccountParty?.id || '', memberId);

      toast.success(`Successfully promoted ${member.displayName} to leader`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to promote member to leader');
    } finally {
      promotingMemberId = undefined;
    }
  }

  function hideImageOnError(e: Event) {
    const target = e.currentTarget as HTMLImageElement;
    target.style.display = 'none';
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-2xl font-bold">Party Management</h1>
  <Tabs {tabs}/>
</div>

{#snippet STWActions()}
  <div class="flex flex-col gap-2">
    <div class="flex flex-row sm:justify-between items-center justify-between gap-x-2">
      <Label.Root class="font-medium">Claim rewards after leaving the mission</Label.Root>
      <Switch bind:checked={shouldClaimRewards}/>
    </div>

    <div class="flex gap-2">
      <AccountCombobox class="grow shrink min-w-0" type="single" bind:selected={kickAllSelectedAccount}/>
      <Button
        class="shrink-0"
        disabled={isDoingSomething || !kickAllSelectedAccount}
        loading={isKicking}
        onclick={kickAll}
        variant="epic"
      >
        Kick All
      </Button>
    </div>

    <Separator.Root class="bg-border h-px"/>

    <div class="flex gap-2">
      <AccountCombobox class="grow shrink min-w-0" type="multiple" bind:selected={leavePartySelectedAccounts}/>
      <Button
        class="shrink-0"
        disabled={isDoingSomething || !leavePartySelectedAccounts?.length}
        loading={isLeaving}
        onclick={() => leaveParty()}
        variant="epic"
      >
        Leave Party
      </Button>
    </div>

    <Separator.Root class="bg-border h-px"/>

    <div class="flex gap-2">
      <AccountCombobox class="grow shrink min-w-0" type="multiple" bind:selected={claimRewardsPartySelectedAccounts}/>
      <Button
        class="shrink-0"
        disabled={isDoingSomething || !claimRewardsPartySelectedAccounts?.length}
        loading={isClaiming}
        onclick={() => leaveParty(true)}
        variant="epic"
      >
        Claim Rewards
      </Button>
    </div>
  </div>
{/snippet}

{#snippet PartyMembers()}
  <div class="space-y-4">
    {#if partyData}
      <div>
        <div class="flex items-center gap-1">
          <span class="text-muted-foreground">Size:</span>
          <span>{partyMembers?.length || 0}/{partyData.maxSize}</span>
        </div>

        <div class="flex items-center gap-1">
          <span class="text-muted-foreground">Region:</span>
          <span>{partyData.region}</span>
        </div>

        <div class="flex items-center gap-1">
          <span class="text-muted-foreground">Created at:</span>
          <span>{partyData.createdAt.toLocaleString()}</span>
        </div>
      </div>
    {/if}

    {#if partyMembers}
      <div class="space-y-2">
        <div class="flex flex-wrap justify-between gap-4">
          {#each partyMembers as member (member.accountId)}
            {@const isRegisteredAccount = allAccounts.some(account => account.accountId === member.accountId)}
            {@const canLeave = isRegisteredAccount && !member.isLeader}
            {@const canKick = partyLeaderAccount && partyLeaderAccount.accountId !== member.accountId}
            {@const canBePromoted = partyLeaderAccount && !member.isLeader}

            <div class="flex flex-col gap-3 p-4 border rounded-md w-60 relative">
              {#if canLeave || canKick || canBePromoted}
                <div class="absolute top-3 right-3">
                  <DropdownMenu.Root contentProps={{ class: 'w-48' }}>
                    {#snippet trigger()}
                      <EllipsisIcon class="size-6"/>
                    {/snippet}

                    <!-- todo: "add friend" option -->

                    {#if canLeave || canKick}
                      <DropdownMenu.Item
                        disabled={isLeaving || kickingMemberIds.has(member.accountId)}
                        onclick={() => canKick
                          ? kickMember(currentAccountParty?.id || '', member.accountId)
                          : leaveParty(false, member.accountId)
                        }
                      >
                        {#if canKick}
                          {#if kickingMemberIds.has(member.accountId)}
                            <LoaderCircleIcon class="size-5 animate-spin"/>
                            Kicking
                          {:else}
                            <UserXIcon class="size-5"/>
                            Kick
                          {/if}
                        {:else if canLeave}
                          {#if isLeaving}
                            <LoaderCircleIcon class="size-5 animate-spin"/>
                            Leaving Party
                          {:else}
                            <LogOutIcon class="size-5"/>
                            Leave Party
                          {/if}
                        {/if}
                      </DropdownMenu.Item>
                    {/if}

                    {#if canBePromoted}
                      <DropdownMenu.Item
                        disabled={!!promotingMemberId}
                        onclick={() => promote(member.accountId)}
                      >
                        {#if promotingMemberId === member.accountId}
                          <LoaderCircleIcon class="size-5 animate-spin"/>
                          Promoting
                        {:else}
                          <CrownIcon class="size-5"/>
                          Promote to Leader
                        {/if}
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Root>
                </div>
              {/if}

              <div class="flex items-center gap-2">
                <div class="size-10 relative">
                  {#if member.avatarUrl}
                    <img class="rounded-md" alt={member.displayName} onerror={hideImageOnError} src={member.avatarUrl}/>
                  {/if}

                  {#if member.isLeader}
                    <div class="absolute -bottom-2 -right-2 select-none" title="Leader">👑</div>
                  {/if}
                </div>

                <a class="flex items-center gap-2 font-medium hover:underline" href="https://fortnitedb.com/profile/{member.accountId}" target="_blank">
                  {#if member.platformSpecificName}
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <span class="text-sm">{member.platformSpecificName}</span>
                        <ExternalLinkIcon class="size-4 text-muted-foreground"/>
                      </div>

                      <span class="text-xs text-muted-foreground">({member.displayName})</span>
                    </div>
                  {:else}
                    <span class="text-sm">{member.displayName}</span>
                    <ExternalLinkIcon class="size-4 text-muted-foreground"/>
                  {/if}
                </a>
              </div>

              <div class="flex-1 flex flex-col gap-4 text-sm">
                <div class="flex flex-col">
                  <div class="flex items-center gap-1">
                    <span class="text-muted-foreground">Platform:</span>
                    <span>{member.platform}</span>
                  </div>

                  <div class="flex items-center gap-1">
                    <span class="text-muted-foreground">Owns STW:</span>
                    <span>{member.ownsSaveTheWorld ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {#if member.loadout.length}
                  <div class="flex flex-col gap-1">
                    <span class="text-muted-foreground">Loadout:</span>
                    <div class="flex gap-1">
                      {#each member.loadout as item (item.type)}
                        <div class="flex items-center gap-1">
                          <img
                            class="size-8 rounded-md"
                            alt={item.type}
                            onerror={hideImageOnError}
                            src={item.icon}
                          />
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <div class="flex items-center justify-between">
                <div class="flex gap-2 text-sm font-medium">
                  <div class="flex items-center gap-1">
                    <img class="size-5" alt="Battle Pass Icon" src="/assets/misc/battle-pass-upgraded.png"/>
                    <span>{member.battlePassLevel}</span>
                  </div>

                  <div class="flex items-center gap-1">
                    <img class="size-5" alt="Crown Icon" src="/assets/misc/crown.png"/>
                    <span>{member.crownedWins}</span>
                  </div>
                </div>

                <div class="{member.isReady ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-full px-3 py-1 text-sm font-medium">
                  {member.isReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/snippet}