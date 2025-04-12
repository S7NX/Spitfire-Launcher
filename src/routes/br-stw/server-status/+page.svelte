<script lang="ts" module>
  type ServiceStatus = {
    status:
      | 'UP'
      | 'DOWN'
      | 'MAJOR_OUTAGE'
      | 'PARTIAL_OUTAGE'
      | 'UNDER_MAINTENANCE';
    message?: string;
  };

  type StatusPageStatus = {
    name: string;
    status:
      | 'operational'
      | 'degraded_performance'
      | 'partial_outage'
      | 'major_outage'
      | 'under_maintenance';
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
  import { formatRemainingDuration, getResolvedResults, t } from '$lib/utils/util';

  $effect(() => {
    if (notifyUser) {
      notifyUserIntervalId = window.setInterval(async () => {
        await fetchServerStatus();

        if (serviceStatus?.status === 'UP') {
          notifyUser = false;
          clearInterval(notifyUserIntervalId);

          await NotificationManager.sendNotification(
            $t('serverStatus.notification.message'),
            $t('serverStatus.notification.title')
          );
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
      toast.error($t('serverStatus.failedToFetch'));
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

  function getStatusData(status: ServiceStatus['status'] | StatusPageStatus['status']) {
    switch (status) {
      case 'UP':
      case 'operational':
        return { text: $t('serverStatus.statuses.operational'), color: 'green' } as const;
      case 'DOWN':
      case 'MAJOR_OUTAGE':
      case 'major_outage':
        return { text: $t('serverStatus.statuses.down'), color: 'red' } as const;
      case 'PARTIAL_OUTAGE':
      case 'partial_outage':
        return { text: $t('serverStatus.statuses.partialOutage'), color: 'orange' } as const;
      case 'UNDER_MAINTENANCE':
      case 'under_maintenance':
        return { text: $t('serverStatus.statuses.underMaintenance'), color: 'blue' } as const;
      case 'degraded_performance':
        return { text: $t('serverStatus.statuses.degradedPerformance'), color: 'yellow' } as const;
      default:
        return { text: $t('serverStatus.statuses.unknown'), color: 'gray' } as const;
    }
  }

  onMount(() => {
    fetchServerStatus();
  });
</script>

<CenteredPageContent class="!w-112" title={$t('serverStatus.page.title')}>
  <div class="flex flex-col gap-4">
    <div class="flex justify-between items-center">
      <p class="text-sm">
        {$t('serverStatus.lastUpdated', { date: lastUpdated ? lastUpdated.toLocaleTimeString() : '...' })}
      </p>

      <Button
        class="flex items-center gap-x-2"
        disabled={isLoading}
        onclick={fetchServerStatus}
        size="sm"
        variant="outline"
      >
        {#if isLoading}
          <LoaderCircleIcon class="size-4 animate-spin" />
          {$t('serverStatus.refreshing')}
        {:else}
          <RefreshCwIcon class="size-4" />
          {$t('serverStatus.refresh')}
        {/if}
      </Button>
    </div>

    {#if serviceStatus && serviceStatus.status !== 'UP'}
      <div class="flex items-center justify-between">
        <Tooltip tooltip={$t('serverStatus.notifyMe.description')}>
          <p class="flex-1 text-sm font-medium">
            {$t('serverStatus.notifyMe.title')}
          </p>
        </Tooltip>

        <Switch
          onCheckedChange={() => {
            NotificationManager.requestPermission();
          }}
          bind:checked={notifyUser}
        />
      </div>
    {/if}
  </div>

  {#if serviceStatus}
    <StatusCard
      color={getStatusData(serviceStatus.status).color}
      message={serviceStatus.message}
      title={$t('serverStatus.status', { status: getStatusData(serviceStatus.status).text })}
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
      message={$t('serverStatus.queue.description', { time: formatRemainingDuration(expectedWait * 1000) })}
      title={$t('serverStatus.queue.title')}
    />
  {/if}

  <Separator.Root class="bg-border h-px" />

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
  {:else if statusPageServices.length > 0}
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-muted-foreground">
        <ExternalLinkIcon class="size-4" />
        <a
          class="text-sm font-medium hover:underline"
          href="https://status.epicgames.com"
          target="_blank"
        >
          status.epicgames.com
        </a>
      </div>

      <div class="space-y-3">
        {#each statusPageServices as service (service.name)}
          <div class="bg-muted/30 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3 truncate">
                <div class="size-3 rounded-full bg-{getStatusData(service.status) .color}-500"></div>
                <span class="font-medium truncate">{service.name}</span>
              </div>
              <div class="text-sm">
                {getStatusData(service.status).text}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</CenteredPageContent>
