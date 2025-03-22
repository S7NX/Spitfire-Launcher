<script lang="ts" module>
  import type { PartyData } from '$types/game/party';

  let partyCache = $state<Map<string, PartyData>>(new Map());

  let isKicking = $state<boolean>();
  let isLeaving = $state<boolean>();
  let isClaiming = $state<boolean>();
  let isDoingSomething = $derived(isKicking || isLeaving || isClaiming);
</script>

<script lang="ts">
  import { accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils';
  import { Label, Separator } from 'bits-ui';
  import Button from '$components/ui/Button.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import AccountSelect from '$components/auth/account/AccountSelect.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import PartyManager from '$lib/core/managers/party';
  import { toast } from 'svelte-sonner';
  import type { AccountData } from '$types/accounts';
  import RewardClaimer from '$lib/core/managers/automation/rewardClaimer';
  import AutomationBase from '$lib/core/managers/automation/base';
  import CenteredPageContent from '$components/CenteredPageContent.svelte';

  const allAccounts = $derived(nonNull($accountsStore.allAccounts));

  let shouldClaimRewards = $state<boolean>();
  let kickAllSelectedAccount = $state<string>();
  let leavePartySelectedAccounts = $state<string[]>();
  let claimRewardsPartySelectedAccounts = $state<string[]>();

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
        await PartyManager.kick(kickerAccount, partyData.id, id);

        const account = allAccounts.find((account) => account.accountId === id);
        const isAutoClaimEnabled = AutomationBase.getAccountById(id)?.settings.autoClaim || false;
        if (account && !isAutoClaimEnabled && shouldClaimRewards) await RewardClaimer.claimRewards(account, true);
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

  async function leaveParty(claimOnly?: boolean) {
    const selectedAccounts = claimOnly ? claimRewardsPartySelectedAccounts : leavePartySelectedAccounts;
    if (!selectedAccounts?.length) return;

    if (claimOnly) {
      isClaiming = true;
    } else {
      isLeaving = true;
    }

    try {
      const accountParties: Map<string, string> = new Map();
      const accounts = allAccounts.filter(account => selectedAccounts?.includes(account.accountId));
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

      toast.success(claimOnly ? 'Successfully claimed rewards' : 'Successfully left parties');
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
</script>

<CenteredPageContent class="!w-112" title="Party Management">
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
</CenteredPageContent>