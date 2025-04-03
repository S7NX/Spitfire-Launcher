<script lang="ts" module>
  import TaxiManager from '$lib/core/managers/automation/taxiManager.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  const taxiManagers = new SvelteMap<string, TaxiManager>();
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Alert from '$components/ui/Alert.svelte';
  import { accountPartiesStore, accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils';
  import { toast } from 'svelte-sonner';
  import Button from '$components/ui/Button.svelte';
  import { Separator } from 'bits-ui';
  import Switch from '$components/ui/Switch.svelte';
  import Input from '$components/ui/Input.svelte';
  import AlertTriangleIcon from 'lucide-svelte/icons/alert-triangle';
  import XIcon from 'lucide-svelte/icons/x';
  import CarTaxiFrontIcon from 'lucide-svelte/icons/car-taxi-front';

  type InputTimeoutId = 'powerLevel' | 'availableStatus' | 'busyStatus';

  const MIN_POWER_LEVEL = 1;
  const MAX_POWER_LEVEL = 145;

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  let inputTimeouts = new Map<InputTimeoutId, number>();

  $effect(() => {
    const hasManager = taxiManagers.has(activeAccount.accountId);
    if (!hasManager) {
      taxiManagers.set(activeAccount.accountId, new TaxiManager(activeAccount));
    }
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

  async function toggleAutoAccept() {
    await taxiManager.toggleAutoAcceptFriendRequests();
  }

  function handleTextInput(timeoutId: InputTimeoutId, event: Event, callbackFn: (event: Event) => void) {
    const timeout = inputTimeouts.get(timeoutId);
    if (timeout) {
      clearTimeout(timeout);
    }

    const newTimeout = window.setTimeout(() => {
      callbackFn(event);
      inputTimeouts.delete(timeoutId);
    }, 1000);

    inputTimeouts.set(timeoutId, newTimeout);
  }

  async function handleTaxiLevelChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;

    const valueNumber = Number.parseInt(value);
    taxiManager.level = Number.isNaN(value) ? MAX_POWER_LEVEL : Math.min(Math.max(valueNumber, MIN_POWER_LEVEL), MAX_POWER_LEVEL);

    const party = accountPartiesStore.get(activeAccount.accountId);
    if (!party) return;

    await taxiManager.setPowerLevel(party.id, party.revision);
  }

  function handleStatusChange(event: Event, statusType: 'available' | 'busy') {
    const value = (event.target as HTMLInputElement).value;
    if (!value) return;

    if (statusType === 'available') {
      taxiManager.availableStatus = value;
    } else {
      taxiManager.busyStatus = value;
    }

    taxiManager.setIsAvailable(taxiManager.isAvailable);
  }
</script>

<CenteredPageContent class="!w-112" description="Play STW missions that are above your power level." title="Taxi Service">
  <Alert
    color="yellow"
    icon={AlertTriangleIcon}
    message='You must select "No Fill" for the taxi to work properly.'
    title="Warning"
  />

  <div class="space-y-4">
    <div class="flex flex-col gap-2">
      <label class="font-medium" for="taxiLevel">Taxi Power Level</label>
      <div class="flex items-center gap-2">
        <Input
          id="taxiLevel"
          max={MAX_POWER_LEVEL}
          min={MIN_POWER_LEVEL}
          oninput={(e) => handleTextInput('powerLevel', e, handleTaxiLevelChange)}
          type="number"
          value={taxiManager.level}
        />
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label class="font-medium" for="availableStatus">Available Status</label>
      <Input
        id="availableStatus"
        oninput={(e) => handleTextInput('availableStatus', e, (event) => handleStatusChange(event, 'available'))}
        placeholder="Taxi's custom status when it's available"
        bind:value={taxiManager.availableStatus}
      />
    </div>

    <div class="flex flex-col gap-2">
      <label class="font-medium" for="busyStatus">Busy Status</label>
      <Input
        id="busyStatus"
        oninput={(e) => handleTextInput('busyStatus', e, (event) => handleStatusChange(event, 'busy'))}
        placeholder="Taxi's custom status when it's busy"
        bind:value={taxiManager.busyStatus}
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
      disabled={taxiManager.isStarting || taxiManager.isStopping}
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