<script lang="ts" module>
  import BotLobbyManager from '$lib/core/managers/automation/botLobbyManager.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  const botLobbyManagers = new SvelteMap<string, BotLobbyManager>();
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Alert from '$components/ui/Alert.svelte';
  import Button from '$components/ui/Button.svelte';
  import TaxiManager from '$lib/core/managers/automation/taxiManager.svelte';
  import MCPManager from '$lib/core/managers/mcp';
  import { Separator } from 'bits-ui';
  import Input from '$components/ui/Input.svelte';
  import Label from '$components/ui/Label.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import DataStorage, { BOT_LOBBY_FILE_PATH } from '$lib/core/dataStorage';
  import { accountsStore } from '$lib/stores';
  import { formatRemainingDuration, getResolvedResults, nonNull } from '$lib/utils/util';
  import type { BotLobbySettings } from '$types/settings';
  import AlertTriangleIcon from 'lucide-svelte/icons/alert-triangle';
  import XIcon from 'lucide-svelte/icons/x';
  import BotIcon from 'lucide-svelte/icons/bot';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import BotLobbyTutorial from '$components/docs/tutorials/BotLobby.svelte';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  let customBotLobbySettings = $state<BotLobbySettings>([]);
  let isCheckingEligibility = $state(false);

  $effect(() => {
    if (!botLobbyManagers.has(activeAccount.accountId)) {
      botLobbyManagers.set(activeAccount.accountId, new BotLobbyManager(activeAccount));
    }

    const botLobbyManager = botLobbyManagers.get(activeAccount.accountId);
    const accountSettings = customBotLobbySettings.find(settings => settings.accountId === activeAccount.accountId);
    if (!botLobbyManager || !accountSettings) return;

    botLobbyManager.availableStatus = accountSettings.availableStatus || botLobbyManager.availableStatus;
    botLobbyManager.busyStatus = accountSettings.busyStatus || botLobbyManager.busyStatus;
  });

  const botLobbyManager = $derived(botLobbyManagers.get(activeAccount.accountId) || new BotLobbyManager(activeAccount));

  async function startBotLobby() {
    try {
      isCheckingEligibility = true;
      const [commonCoreQueryProfile, athenaQueryProfile] = await getResolvedResults([
        MCPManager.queryProfile(activeAccount, 'common_core'),
        MCPManager.queryProfile(activeAccount, 'athena')
      ]);

      if (!commonCoreQueryProfile || !athenaQueryProfile) {
        throw new Error('Failed to fetch profile data');
      }

      const banStatus = commonCoreQueryProfile.profileChanges[0].profile.stats.attributes.ban_status;
      if (banStatus) {
        isCheckingEligibility = false;

        const banExpirationMs = banStatus.banDurationDays
          ? (new Date(banStatus.banStartTimeUtc).getTime() + banStatus.banDurationDays * 24 * 60 * 60 * 1000) - Date.now()
          : null;

        toast.error(banExpirationMs
          ? `This account is banned from matchmaking for ${formatRemainingDuration(banExpirationMs)}.`
          : 'This account is banned from matchmaking indefinitely.'
        );

        if (banStatus.bRequiresUserAck) {
          await MCPManager.compose(activeAccount, 'SetMatchmakingBansViewed', 'common_core', {}).catch(() => null);
        }

        return;
      }

      if (athenaQueryProfile.profileChanges[0].profile.stats.attributes.last_match_end_datetime) {
        isCheckingEligibility = false;
        toast.error('You must use a fresh account with no match history to start a bot lobby.');
        return;
      }

      isCheckingEligibility = false;
      await botLobbyManager.start();
    } catch (error) {
      isCheckingEligibility = false;
      console.error(error);
      toast.error('Failed to start the bot lobby');
    }
  }

  async function stopBotLobby() {
    try {
      await botLobbyManager.stop();
    } catch (error) {
      console.error(error);
      toast.error('Failed to stop the bot lobby');
    }
  }

  function toggleAutoAccept() {
    botLobbyManager.handleFriendRequests();
  }

  function handleStatusChange(event: Event & { currentTarget: HTMLInputElement }, statusType: 'available' | 'busy') {
    const value = event.currentTarget.value;
    if (!value) return;

    const oldStatus = statusType === 'available' ? botLobbyManager.availableStatus : botLobbyManager.busyStatus;
    if (value === oldStatus) return;

    let settings = customBotLobbySettings.find(settings => settings.accountId === activeAccount.accountId);

    if (!settings) {
      settings = { accountId: activeAccount.accountId };
      customBotLobbySettings.push(settings);
    }

    if (statusType === 'available') {
      botLobbyManager.availableStatus = value;
      settings.availableStatus = value;
    } else {
      botLobbyManager.busyStatus = value;
      settings.busyStatus = value;
    }

    event.currentTarget.value = value;
    botLobbyManager.setIsAvailable(botLobbyManager.isAvailable);
    DataStorage.writeConfigFile<BotLobbySettings>(BOT_LOBBY_FILE_PATH, customBotLobbySettings);
  }

  onMount(async () => {
    customBotLobbySettings = await DataStorage.getBotLobbyFile();
  });
</script>

<CenteredPageContent
  class="!w-112"
  description="Turn your account into a bot lobby bot."
  docsComponent={BotLobbyTutorial}
  title="Bot Lobby"
>
  <Alert
    color="yellow"
    icon={AlertTriangleIcon}
    message="The account you turn into a bot lobby bot can get banned! Use at your own risk."
    title="Warning"
  />

  <div class="space-y-4">
    <div class="flex flex-col gap-2">
      <Label for="availableStatus">Available Status</Label>
      <Input
        id="availableStatus"
        onConfirm={(event) => handleStatusChange(event, 'available')}
        placeholder="Bot's custom status when it's available"
        value={botLobbyManager.availableStatus}
      />
    </div>

    <div class="flex flex-col gap-2">
      <Label for="busyStatus">Busy Status</Label>
      <Input
        id="busyStatus"
        onConfirm={(event) => handleStatusChange(event, 'busy')}
        placeholder="Bot's custom status when it's busy"
        value={botLobbyManager.busyStatus}
      />
    </div>

    <div class="flex items-center justify-between">
      <div class="font-medium">Auto-Accept Friend Requests</div>
      <Switch
        onCheckedChange={toggleAutoAccept}
        bind:checked={botLobbyManager.autoAcceptFriendRequests}
      />
    </div>
  </div>

  <Separator.Root class="bg-border h-px"/>

  <div class="flex justify-end">
    <Button
      class="flex items-center gap-x-2"
      disabled={botLobbyManager.isStarting || botLobbyManager.isStopping || TaxiManager.taxiAccountIds.has(activeAccount.accountId) || isCheckingEligibility}
      loading={botLobbyManager.isStarting || botLobbyManager.isStopping || isCheckingEligibility}
      loadingText={isCheckingEligibility ? 'Checking' : botLobbyManager.isStarting ? 'Starting' : 'Stopping'}
      onclick={() => botLobbyManager.active ? stopBotLobby() : startBotLobby()}
      variant={botLobbyManager.active ? 'danger' : 'epic'}
    >
      {#if botLobbyManager.active}
        <XIcon class="size-5"/>
        Stop Bot Lobby
      {:else}
        <BotIcon class="size-5"/>
        Start Bot Lobby
      {/if}
    </Button>
  </div>
</CenteredPageContent>