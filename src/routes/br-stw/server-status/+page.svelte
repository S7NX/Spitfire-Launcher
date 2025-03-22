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
  import ServerStatusManager from '$lib/core/managers/serverStatus';
  import type { LightswitchData } from '$types/game/serverStatus';
  import { LinkIcon } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import { formatRemainingDuration, getResolvedResults } from '$lib/utils';

  $effect(() => {
    console.log('notifyUser', notifyUser, notifyUserIntervalId);
    if (notifyUser) {
      notifyUserIntervalId = window.setInterval(async () => {
        await fetchServerStatus();

        if (serviceStatus?.status === 'UP') {
          notifyUser = false;
          clearInterval(notifyUserIntervalId);

          // todo: show a notification
          toast.success('Fortnite is back online!');
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
        ServerStatusManager.getLightswitch(),
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
      toast.error('Failed to fetch server status.');
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

  function getStatusBackgroundColor(status: ServiceStatus['status'] | string) {
    switch (status) {
      case 'UP':
      case 'operational':
        return 'bg-green-500/20 border-green-500/50';
      case 'DOWN':
      case 'MAJOR_OUTAGE':
      case 'major_outage':
        return 'bg-red-500/20 border-red-500/50';
      case 'PARTIAL_OUTAGE':
      case 'partial_outage':
        return 'bg-orange-500/20 border-orange-500/50';
      case 'UNDER_MAINTENANCE':
      case 'under_maintenance':
        return 'bg-blue-500/20 border-blue-500/50';
      default:
        return 'bg-gray-500/20 border-gray-500/50';
    }
  }

  function getStatusColor(status: ServiceStatus['status'] | string) {
    switch (status) {
      case 'UP':
      case 'operational':
        return 'bg-green-500';
      case 'DOWN':
      case 'MAJOR_OUTAGE':
      case 'major_outage':
        return 'bg-red-500';
      case 'PARTIAL_OUTAGE':
      case 'partial_outage':
        return 'bg-orange-500';
      case 'UNDER_MAINTENANCE':
      case 'under_maintenance':
        return 'bg-blue-500';
      case 'degraded_performance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  function getStatusText(status: ServiceStatus['status'] | string) {
    switch (status) {
      case 'UP':
      case 'operational':
        return 'Operational';
      case 'DOWN':
      case 'major_outage':
        return 'Down';
      case 'MAJOR_OUTAGE':
        return 'Major Outage';
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

{#snippet StatusCard({ backgroundColor, dotColor, title, message }: { backgroundColor: String; dotColor: String; title: String; message?: String; })}
  <div class="border rounded-lg p-3 mb-2 {backgroundColor}">
    <div class="flex items-center gap-2">
      <div class="size-3 rounded-full {dotColor}"></div>
      <span class="font-medium">{title}</span>
    </div>

    {#if message}
      <p class="text-sm mt-1">{message}</p>
    {/if}
  </div>
{/snippet}

<CenteredPageContent title="Fortnite Server Status">
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <p class="text-sm ">
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
        <Switch checked={notifyUser} onCheckedChange={((checked) => notifyUser = checked) }/>
      </div>
    {/if}
  </div>

  {#if serviceStatus}
    {@render StatusCard({
      backgroundColor: getStatusBackgroundColor(serviceStatus.status),
      dotColor: getStatusColor(serviceStatus.status),
      title: `Fortnite Status: ${getStatusText(serviceStatus.status)}`,
      message: serviceStatus.message
    })}
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
    {@render StatusCard({
      backgroundColor: 'bg-yellow-500/20 border-yellow-500/50',
      dotColor: 'bg-yellow-500',
      title: 'Queue Active',
      message: `Expected wait time: ${formatRemainingDuration(expectedWait * 1000)}`
    })}
  {/if}

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
          <LinkIcon class="size-4"/>
          <a class="text-sm font-medium hover:underline" href="https://status.epicgames.com" target="_blank">status.epicgames.com</a>
        </div>

        <div class="space-y-3">
          {#each statusPageServices as service (service.name)}
            <div class="bg-muted/30 p-4 rounded-lg">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3 truncate">
                  <div class="size-3 rounded-full {getStatusColor(service.status)}"></div>
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