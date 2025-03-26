<script lang="ts" module>
  type ServiceStatus = {
    status: 'UP' | 'DOWN' | 'MAJOR_OUTAGE' | 'PARTIAL_OUTAGE' | 'UNDER_MAINTENANCE';
    message?: string;
  };

  type StatusPageStatus = {
    name: string;
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  };

  let isLoading = $state(true);
  let notifyUser = $state(false);
  let notifyUserIntervalId: number;
  let serviceStatus = $state<ServiceStatus>();
  let statusPageServices = $state<StatusPageStatus[]>([]);
  let expectedWait = $state<number>(0);
  let lastUpdated = $state<Date>();
</script>

<script lang="ts">
  import Switch from '$components/ui/Switch.svelte';
  import Tooltip from '$components/ui/Tooltip.svelte';
  import StatusCard from '$components/ui/StatusCard.svelte';
  import NotificationManager from '$lib/core/managers/notification';
  import ServerStatusManager from '$lib/core/managers/serverStatus';
  import { accountsStore } from '$lib/stores';
  import type { LightswitchData } from '$types/game/serverStatus';
  import { Separator } from 'bits-ui';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import { formatRemainingDuration, getResolvedResults } from '$lib/utils';

  $effect(() => {
    if (notifyUser) {
      notifyUserIntervalId = window.setInterval(async () => {
        await fetchServerStatus();

        if (serviceStatus?.status === 'UP') {
          notifyUser = false;
          clearInterval(notifyUserIntervalId);

          await NotificationManager.sendNotification('Fortnite is back online!', 'Fortnite Server Status');
        }
      }, 15_000);
    } else {
      clearInterval(notifyUserIntervalId);
    }
  });

  async function fetchServerStatus() {
    isLoading = true;

    try {
      const [lightswitchData, queueData, statusPageData] = await getResolvedResults([
        ServerStatusManager.getLightswitch($accountsStore.activeAccount || undefined),
        ServerStatusManager.getWaitingRoom(),
        ServerStatusManager.getStatusPage()
      ]);

      lastUpdated = new Date();

      if (lightswitchData) {
        serviceStatus = {
          status: getStatusFromLightswitch(lightswitchData),
          message: lightswitchData.message
        };
      }

      expectedWait = queueData?.expectedWait || 0;

      if (statusPageData?.components) {
        const fortniteComponentIds = statusPageData.components.find((x) => x.name === 'Fortnite')!.components;

        statusPageServices = fortniteComponentIds.map((id) => {
          const component = statusPageData.components.find((x) => x.id === id);
          return {
            name: component!.name,
            status: component!.status as StatusPageStatus['status']
          };
        });
      }

    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch server status');
    } finally {
      isLoading = false;
    }
  }

  function getStatusFromLightswitch(data: LightswitchData): ServiceStatus['status'] {
    if (data.status !== 'UP') {
      if (data.allowedActions && data.allowedActions.includes('PLAY')) {
        return 'PARTIAL_OUTAGE';
      }

      return data.message?.includes('maintenance') ? 'UNDER_MAINTENANCE' : 'MAJOR_OUTAGE';
    }

    return 'UP';
  }

  function getStatusColor(status: ServiceStatus['status'] | StatusPageStatus['status']) {
    switch (status) {
      case 'UP':
      case 'operational':
        return 'green';
      case 'DOWN':
      case 'MAJOR_OUTAGE':
      case 'major_outage':
        return 'red';
      case 'PARTIAL_OUTAGE':
      case 'partial_outage':
        return 'orange';
      case 'UNDER_MAINTENANCE':
      case 'under_maintenance':
        return 'blue';
      case 'degraded_performance':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  function getStatusText(status: ServiceStatus['status'] | StatusPageStatus['status']) {
    switch (status) {
      case 'UP':
      case 'operational':
        return 'Operational';
      case 'DOWN':
      case 'major_outage':
      case 'MAJOR_OUTAGE':
        return 'Down';
      case 'PARTIAL_OUTAGE':
      case 'partial_outage':
        return 'Partial Outage';
      case 'UNDER_MAINTENANCE':
      case 'under_maintenance':
        return 'Maintenance';
      case 'degraded_performance':
        return 'Degraded Performance';
      default:
        return 'Unknown';
    }
  }

  onMount(() => {
    fetchServerStatus();
  });
</script>

<CenteredPageContent class="!w-112" title="Fortnite Server Status">
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <p class="text-sm">
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
      </p>

      <Button
        class="flex items-center gap-2"
        disabled={isLoading}
        onclick={fetchServerStatus}
        size="sm"
        variant="outline"
      >
        {#if isLoading}
          <LoaderCircleIcon class="size-4 animate-spin"/>
        {:else}
          <RefreshCwIcon class="size-4"/>
        {/if}
        Refresh
      </Button>
    </div>

    {#if serviceStatus && serviceStatus.status !== 'UP'}
      <div class="flex items-center justify-between">
        <Tooltip tooltip="Receive a notification when Fortnite is back online">
          <p class="flex-1 text-sm font-medium">Notify me</p>
        </Tooltip>

        <Switch
          checked={notifyUser}
          onCheckedChange={((checked) => {
            notifyUser = checked;
            NotificationManager.requestPermission();
          })}
        />
      </div>
    {/if}
  </div>

  {#if serviceStatus}
    <StatusCard
      color={getStatusColor(serviceStatus.status)}
      message={serviceStatus.message}
      title="Status: {getStatusText(serviceStatus.status)}"
    />
  {:else}
    <div class="border rounded-lg p-3 mb-2 bg-muted/50 skeleton-loader">
      <div class="flex items-center gap-2">
        <div class="size-3 rounded-full bg-muted/80"></div>
        <div class="font-medium bg-muted/80 rounded w-24"></div>
      </div>

      <div class="h-8 bg-muted/80 rounded w-20"></div>
    </div>
  {/if}

  {#if expectedWait}
    <StatusCard
      color="yellow"
      message="Expected wait time: {formatRemainingDuration(expectedWait * 1000)}"
      title="Queue Active"
    />
  {/if}

  <Separator.Root class="bg-border h-px"/>

  {#if isLoading && !statusPageServices.length}
    <div class="space-y-4">
      {#each Array(4) as _, i (i)}
        <div class="bg-muted/50 p-4 rounded-lg skeleton-loader">
          <div class="flex justify-between">
            <div class="h-6 bg-muted/80 rounded w-24"></div>
            <div class="h-6 bg-muted/80 rounded w-20"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    {#if statusPageServices.length > 0}
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-muted-foreground">
          <ExternalLinkIcon class="size-4"/>
          <a class="text-sm font-medium hover:underline" href="https://status.epicgames.com" target="_blank">status.epicgames.com</a>
        </div>

        <div class="space-y-3">
          {#each statusPageServices as service (service.name)}
            <div class="bg-muted/30 p-4 rounded-lg">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3 truncate">
                  <div class="size-3 rounded-full bg-{getStatusColor(service.status)}-500"></div>
                  <span class="font-medium truncate">{service.name}</span>
                </div>
                <div class="text-sm">
                  {getStatusText(service.status)}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</CenteredPageContent>