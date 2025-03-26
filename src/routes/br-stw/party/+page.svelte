<!-- todo: update automatically with xmpp? -->

<script lang="ts" module>
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import type { PartyData } from '$types/game/party';

  let partyCache = new SvelteMap<string, PartyData>();

  let isKicking = $state<boolean>();
  let isLeaving = $state<boolean>();
  let isClaiming = $state<boolean>();
  let isDoingSomething = $derived(isKicking || isLeaving || isClaiming);
</script>

<script lang="ts">
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import Button from '$components/ui/Button.svelte';
  import Dropdown from '$components/ui/Dropdown.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import { accountsStore } from '$lib/stores';
  import { cn, nonNull } from '$lib/utils';
  import { DropdownMenu, Label, Separator } from 'bits-ui';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import LogOutIcon from 'lucide-svelte/icons/log-out';
  import UserXIcon from 'lucide-svelte/icons/user-x';
  import CrownIcon from 'lucide-svelte/icons/crown';
  import EllipsisIcon from 'lucide-svelte/icons/ellipsis';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import PartyManager from '$lib/core/managers/party';
  import { toast } from 'svelte-sonner';
  import type { AccountData } from '$types/accounts';
  import RewardClaimer from '$lib/core/managers/automation/rewardClaimer';
  import AutomationBase from '$lib/core/managers/automation/base';

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
    loadout: Array<{
      type: 'outfit' | 'backpack' | 'pickaxe' | 'contrail';
      icon: string;
    }>;
  };

  const currentAccountParty = $derived(partyCache.get(activeAccount.accountId));
  const partyData = $derived<Party | undefined>(currentAccountParty && {
    maxSize: currentAccountParty.config.max_size,
    region: currentAccountParty.meta['Default:RegionId_s'],
    createdAt: new Date(currentAccountParty.created_at)
  });
  const partyMembers = $derived<PartyMember[] | undefined>(currentAccountParty && currentAccountParty.members.map(member => {
    const athenaCosmeticLoadout = JSON.parse(member.meta['Default:AthenaCosmeticLoadout_j']).AthenaCosmeticLoadout;
    const getLoadoutSmallIcon = (id: string, splitWith = '.') => `https://fortnite-api.com/images/cosmetics/br/${id?.split(splitWith)[1]}/smallicon.png`;

    return {
      accountId: member.account_id,
      displayName: member.meta['urn:epic:member:dn_s'],
      platformSpecificName: member.connections[0].meta['account_pl_dn'],
      avatarUrl: `https://fortnite-api.com/images/cosmetics/br/${athenaCosmeticLoadout.characterPrimaryAssetId?.split(':')[1]}/smallicon.png`,
      platform: member.connections[0].meta['urn:epic:conn:platform_s'],
      ownsSaveTheWorld: JSON.parse(member.meta['Default:PackedState_j'].replaceAll('True', 'true')).PackedState.hasPurchasedSTW,
      isReady: JSON.parse(member.meta['Default:LobbyState_j']).LobbyState.gameReadiness === 'Ready',
      isLeader: member.role === 'CAPTAIN',
      battlePassLevel: JSON.parse(member.meta['Default:BattlePassInfo_j']).BattlePassInfo.passLevel,
      crownedWins: athenaCosmeticLoadout.cosmeticStats.find((x: any) => x.statName === 'TotalRoyalRoyales')?.value || 0,
      loadout: [
        { type: 'outfit', icon: getLoadoutSmallIcon(athenaCosmeticLoadout.characterPrimaryAssetId, ':') },
        { type: 'backpack', icon: getLoadoutSmallIcon(athenaCosmeticLoadout.backpackDef) },
        { type: 'pickaxe', icon: getLoadoutSmallIcon(athenaCosmeticLoadout.pickaxeDef) },
        { type: 'contrail', icon: getLoadoutSmallIcon(athenaCosmeticLoadout.contrailDef) }
      ]
    };
  }));
  const partyLeaderAccount = $derived(allAccounts.find(account => partyMembers?.some(member => member.accountId === account.accountId && member.isLeader)));

  let shouldClaimRewards = $state<boolean>();
  let kickAllSelectedAccount = $state<string>();
  let leavePartySelectedAccounts = $state<string[]>();
  let claimRewardsPartySelectedAccounts = $state<string[]>();
  let kickingMemberIds = new SvelteSet<string>();
  let promotingMemberId = $state<string>();

  const tabs = $derived([
    { name: 'STW Actions', component: STWActions },
    { name: 'Party', component: Party, disabled: !partyData && !partyMembers?.length }
  ]);

  // svelte-ignore state_referenced_locally
  let activeTab = $state(tabs[0].name);

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

      await PartyManager.kick(kickerAccount, partyData.id, kickerAccount.accountId);

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
    kickingMemberIds.add(memberId);

    try {
      await PartyManager.kick(kicker!, partyId, memberId);

      const account = allAccounts.find((account) => account.accountId === memberId);
      const isAutoClaimEnabled = AutomationBase.getAccountById(memberId)?.settings.autoClaim || false;
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
          partyCache.set(member.account_id, party);
        }
      }

      await Promise.allSettled(Array.from(accountParties).map(async ([accountId, partyId]) => {
        const account = allAccounts.find((account) => account.accountId === accountId)!;
        if (!claimOnly) await PartyManager.kick(account, partyId, account.accountId);

        const isAutoClaimEnabled = AutomationBase.getAccountById(accountId)?.settings.autoClaim || false;
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
    const cache = partyCache.get(account.accountId);
    if (cache) return cache;

    const partyResponse = await PartyManager.get(account);
    const party = partyResponse?.current[0];
    if (!party) return;

    partyCache.set(account.accountId, party);

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
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-2xl font-bold">Party Management</h1>

  <div class="flex flex-col">
    <div class="flex border-b mb-4">
      {#each tabs as tab (tab.name)}
        <button
          class={cn(
            'px-3 py-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            activeTab === tab.name
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          disabled={tab.disabled}
          onclick={() => activeTab = tab.name}
        >
          {tab.name}
        </button>
      {/each}
    </div>

    {#each tabs as tab (tab.name)}
      {#if activeTab === tab.name}
        {@render tab.component()}
      {/if}
    {/each}
  </div>
</div>

{#snippet STWActions()}
  <div class="flex flex-col gap-2">
    <div class="flex flex-row sm:justify-between items-center justify-between gap-x-2">
      <Label.Root class="font-medium">Claim rewards after leaving the mission</Label.Root>
      <Switch checked={shouldClaimRewards} onCheckedChange={(checked) => shouldClaimRewards = checked}/>
    </div>

    <div class="flex gap-2">
      <AccountSelect class="grow shrink min-w-0" type="single" bind:selected={kickAllSelectedAccount}/>
      <Button
        class="flex items-center justify-center shrink-0"
        disabled={isDoingSomething || !kickAllSelectedAccount}
        onclick={kickAll}
        variant="epic">
        {#if isKicking}
          <LoaderCircleIcon class="size-5 animate-spin mr-2"/>
        {/if}
        Kick All
      </Button>
    </div>

    <Separator.Root class="bg-border h-px"/>

    <div class="flex gap-2">
      <AccountSelect class="grow shrink min-w-0" type="multiple" bind:selected={leavePartySelectedAccounts}/>
      <Button
        class="flex items-center justify-center shrink-0"
        disabled={isDoingSomething || !leavePartySelectedAccounts?.length}
        onclick={() => leaveParty()}
        variant="epic"
      >
        {#if isLeaving}
          <LoaderCircleIcon class="size-5 animate-spin mr-2"/>
        {/if}
        Leave Party
      </Button>
    </div>

    <Separator.Root class="bg-border h-px"/>

    <div class="flex gap-2">
      <AccountSelect class="grow shrink min-w-0" type="multiple" bind:selected={claimRewardsPartySelectedAccounts}/>
      <Button
        class="flex items-center justify-center shrink-0"
        disabled={isDoingSomething || !claimRewardsPartySelectedAccounts?.length}
        onclick={() => leaveParty(true)}
        variant="epic"
      >
        {#if isClaiming}
          <LoaderCircleIcon class="size-5 animate-spin mr-2"/>
        {/if}
        Claim Rewards
      </Button>
    </div>
  </div>
{/snippet}

{#snippet Party()}
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
            <div class="flex flex-col gap-3 p-4 border rounded-md w-60 relative">
              {#if partyLeaderAccount}
                <div class="absolute top-3 right-3">
                  <Dropdown contentProps={{ class: 'w-48' }}>
                    {#snippet trigger()}
                      <EllipsisIcon class="size-6"/>
                    {/snippet}

                    <!-- todo: "add friend" -->

                    <DropdownMenu.Item
                      class={cn(
                        'flex gap-2 w-full text-left px-4 py-2 text-sm truncate rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
                        'hover:bg-accent hover:cursor-pointer transition-colors',
                        'flex items-center'
                      )}
                      disabled={partyLeaderAccount.accountId === member.accountId ? isLeaving : kickingMemberIds.has(member.accountId)}
                      onclick={() => partyLeaderAccount.accountId === member.accountId
                        ? leaveParty(false, member.accountId)
                        : kickMember(currentAccountParty?.id || '', member.accountId)
                      }
                    >
                      {#if partyLeaderAccount.accountId === member.accountId}
                        {#if isLeaving}
                          <LoaderCircleIcon class="size-5"/>
                          Leaving Party
                        {:else}
                          <LogOutIcon class="size-5"/>
                          Leave Party
                        {/if}
                      {:else}
                        {#if kickingMemberIds.has(member.accountId)}
                          <LoaderCircleIcon class="size-5"/>
                          Kicking
                        {:else}
                          <UserXIcon class="size-5"/>
                          Kick
                        {/if}
                      {/if}
                    </DropdownMenu.Item>

                    {#if !member.isLeader}
                      <DropdownMenu.Item
                        class={cn(
                          'flex gap-2 w-full text-left px-4 py-2 text-sm truncate rounded-md',
                          'hover:bg-accent hover:cursor-pointer transition-colors',
                          'flex items-center'
                        )}
                        disabled={!!promotingMemberId}
                        onclick={() => promote(member.accountId)}
                      >
                        {#if promotingMemberId === member.accountId}
                          <LoaderCircleIcon class="size-5"/>
                          Promoting
                        {:else}
                          <CrownIcon class="size-5"/>
                          Promote to Leader
                        {/if}
                      </DropdownMenu.Item>
                    {/if}
                  </Dropdown>
                </div>
              {/if}

              <div class="flex items-center gap-2">
                <div class="size-10 relative">
                  <img class="rounded-md" alt={member.displayName} src={member.avatarUrl}/>

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