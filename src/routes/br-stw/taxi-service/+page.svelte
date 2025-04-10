<script lang="ts" module>
  import TaxiManager from '$lib/core/managers/automation/taxiManager.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  const taxiManagers = new SvelteMap<string, TaxiManager>();
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Alert from '$components/ui/Alert.svelte';
  import Label from '$components/ui/Label.svelte';
  import DataStorage, { TAXI_FILE_PATH } from '$lib/core/dataStorage';
  import BotLobbyManager from '$lib/core/managers/automation/botLobbyManager.svelte';
  import { accountPartiesStore, accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils/util';
  import type { TaxiSettings } from '$types/settings';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Button from '$components/ui/Button.svelte';
  import { Separator } from 'bits-ui';
  import Switch from '$components/ui/Switch.svelte';
  import Input from '$components/ui/Input.svelte';
  import AlertTriangleIcon from 'lucide-svelte/icons/alert-triangle';
  import XIcon from 'lucide-svelte/icons/x';
  import CarTaxiFrontIcon from 'lucide-svelte/icons/car-taxi-front';
  import TaxiServiceTutorial from '$components/docs/tutorials/TaxiService.svelte';

  const MIN_POWER_LEVEL = 1;
  const MAX_POWER_LEVEL = 145;

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  let customTaxiSettings = $state<TaxiSettings>([]);

  $effect(() => {
    if (!taxiManagers.has(activeAccount.accountId)) {
      taxiManagers.set(activeAccount.accountId, new TaxiManager(activeAccount));
    }

    const taxiManager = taxiManagers.get(activeAccount.accountId);
    const accountSettings = customTaxiSettings.find(settings => settings.accountId === activeAccount.accountId);
    if (!taxiManager || !accountSettings) return;

    taxiManager.availableStatus = accountSettings.availableStatus || taxiManager.availableStatus;
    taxiManager.busyStatus = accountSettings.busyStatus || taxiManager.busyStatus;
  });

  const taxiManager = $derived(taxiManagers.get(activeAccount.accountId) || new TaxiManager(activeAccount));

  async function startTaxiService() {
    try {
      await taxiManager.start();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start the taxi service');
    }
  }

  async function stopTaxiService() {
    try {
      await taxiManager.stop();
    } catch (error) {
      console.error(error);
      toast.error('Failed to stop the taxi service');
    }
  }

  function toggleAutoAccept() {
    taxiManager.handleFriendRequests();
  }

  function handleTaxiLevelChange(event: Event & { currentTarget: HTMLInputElement }) {
    const value = event.currentTarget.value;
    if (!value) return;

    const oldLevel = taxiManager.level;
    const valueNumber = Number.parseInt(value);
    taxiManager.level = Number.isNaN(valueNumber) ? MAX_POWER_LEVEL : Math.min(Math.max(valueNumber, MIN_POWER_LEVEL), MAX_POWER_LEVEL);

    if (taxiManager.level === oldLevel) return;

    const party = accountPartiesStore.get(activeAccount.accountId);
    if (!party) return;

    taxiManager.setPowerLevel(party.id, party.revision);
  }

  function handleStatusChange(event: Event & { currentTarget: HTMLInputElement }, statusType: 'available' | 'busy') {
    const value = event.currentTarget.value;
    if (!value) return;

    const oldStatus = statusType === 'available' ? taxiManager.availableStatus : taxiManager.busyStatus;
    if (value === oldStatus) return;

    let settings = customTaxiSettings.find(settings => settings.accountId === activeAccount.accountId);

    if (!settings) {
      settings = { accountId: activeAccount.accountId };
      customTaxiSettings.push(settings);
    }

    if (statusType === 'available') {
      taxiManager.availableStatus = value;
      settings.availableStatus = value;
    } else {
      taxiManager.busyStatus = value;
      settings.busyStatus = value;
    }

    event.currentTarget.value = value;
    taxiManager.setIsAvailable(taxiManager.isAvailable);
    DataStorage.writeConfigFile<TaxiSettings>(TAXI_FILE_PATH, customTaxiSettings);
  }

  onMount(async () => {
    customTaxiSettings = await DataStorage.getTaxiFile();
  });
</script>

<CenteredPageContent
  class="!w-112"
  description="Turn your account into a taxi and play STW missions that are above your power level."
  docsComponent={TaxiServiceTutorial}
  title="Taxi Service"
>
  <Alert
    color="yellow"
    icon={AlertTriangleIcon}
    message='You must select "No Fill" for the taxi to work properly.'
    title="Warning"
  />

  <div class="space-y-4">
    <div class="flex flex-col gap-2">
      <Label for="taxiLevel">Power Level</Label>
      <Input
        id="taxiLevel"
        max={MAX_POWER_LEVEL}
        min={MIN_POWER_LEVEL}
        onConfirm={handleTaxiLevelChange}
        type="number"
        value={taxiManager.level}
      />
    </div>

    <div class="flex flex-col gap-2">
      <Label for="availableStatus">Available Status</Label>
      <Input
        id="availableStatus"
        onConfirm={(event) => handleStatusChange(event, 'available')}
        placeholder="Taxi's custom status when it's available"
        value={taxiManager.availableStatus}
      />
    </div>

    <div class="flex flex-col gap-2">
      <Label for="busyStatus">Busy Status</Label>
      <Input
        id="busyStatus"
        onConfirm={(event) => handleStatusChange(event, 'busy')}
        placeholder="Taxi's custom status when it's busy"
        value={taxiManager.busyStatus}
      />
    </div>

    <div class="flex items-center justify-between">
      <div class="font-medium">Auto-Accept Friend Requests</div>
      <Switch
        onCheckedChange={toggleAutoAccept}
        bind:checked={taxiManager.autoAcceptFriendRequests}
      />
    </div>
  </div>

  <Separator.Root class="bg-border h-px"/>

  <div class="flex justify-end">
    <Button
      class="flex items-center gap-x-2"
      disabled={taxiManager.isStarting || taxiManager.isStopping || BotLobbyManager.botLobbyAccountIds.has(activeAccount.accountId)}
      loading={taxiManager.isStarting || taxiManager.isStopping}
      loadingText={taxiManager.isStarting ? 'Starting' : 'Stopping'}
      onclick={() => taxiManager.active ? stopTaxiService() : startTaxiService()}
      variant={taxiManager.active ? 'danger' : 'epic'}
    >
      {#if taxiManager.active}
        <XIcon class="size-5"/>
        Stop Taxi Service
      {:else}
        <CarTaxiFrontIcon class="size-5"/>
        Start Taxi Service
      {/if}
    </Button>
  </div>
</CenteredPageContent>