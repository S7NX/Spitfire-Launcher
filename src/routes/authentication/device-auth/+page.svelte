<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import Trash2Icon from 'lucide-svelte/icons/trash-2';
  import PencilLineIcon from 'lucide-svelte/icons/pencil-line';
  import { toast } from 'svelte-sonner';
  import DeviceAuthManager from '$lib/core/managers/deviceAuth';
  import type { EpicDeviceAuthData } from '$types/game/authorizations';
  import type { DeviceAuthsSettings } from '$types/settings';
  import { onMount } from 'svelte';
  import DataStorage, { DEVICE_AUTHS_FILE_PATH } from '$lib/core/dataStorage';
  import { accountsStore } from '$lib/stores';
  import { nonNull } from '$lib/utils';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let deviceAuths = $state<Omit<EpicDeviceAuthData, 'secret'>[]>([]);
  let isFetching = $state(false);
  let isGenerating = $state(false);
  let isDeleting = $state(false);

  let deviceAuthsSettings = $state<DeviceAuthsSettings>();

  const deviceNameTimeouts = new Map<string, number>();

  function handleBlur(event: FocusEvent, deviceId: string) {
    const element = event.target as HTMLSpanElement;

    if (!element.textContent?.trim()) {
      element.textContent = 'No Name';
      saveDeviceName(deviceId, null);
    }
  }

  function handleDeviceNameInput(deviceId: string, event: Event & { currentTarget: EventTarget & HTMLSpanElement; }) {
    if (deviceNameTimeouts.has(deviceId)) {
      clearTimeout(deviceNameTimeouts.get(deviceId));
    }

    const newName = (event.target as HTMLSpanElement).textContent?.trim() || null;

    const timeoutId = setTimeout(() => {
      saveDeviceName(deviceId, newName);
    }, 1000);

    deviceNameTimeouts.set(deviceId, timeoutId);
  }

  async function saveDeviceName(deviceId: string, newName: string | null) {
    if (!deviceId) return;

    deviceAuthsSettings ??= [];

    if (!newName) {
      const deviceAuthRemoved = deviceAuthsSettings.filter(x => x.deviceId !== deviceId);
      await DataStorage.writeConfigFile(DEVICE_AUTHS_FILE_PATH, deviceAuthRemoved);

      deviceAuthsSettings = deviceAuthRemoved;
    } else {
      let setting = deviceAuthsSettings.find(x => x.deviceId === deviceId);
      if (setting) {
        setting.customName = newName;
      } else {
        deviceAuthsSettings.push({
          deviceId,
          customName: newName
        });
      }

      await DataStorage.writeConfigFile(DEVICE_AUTHS_FILE_PATH, deviceAuthsSettings);
    }
  }

  async function fetchDeviceAuths() {
    isFetching = true;

    try {
      const data = await DeviceAuthManager.getAll(activeAccount);
      deviceAuths = data.sort((a, b) => {
        const aHasCustomName = deviceAuthsSettings?.some(x => x.deviceId === a.deviceId) ? 1 : 0;
        const bHasCustomName = deviceAuthsSettings?.some(x => x.deviceId === b.deviceId) ? 1 : 0;
        const hasCustomName = bHasCustomName - aHasCustomName;

        const aDate = a.lastAccess?.dateTime || a.created?.dateTime;
        const bDate = b.lastAccess?.dateTime || b.created?.dateTime;
        const dateDifference = aDate && bDate && new Date(bDate).getTime() - new Date(aDate).getTime();

        return hasCustomName || dateDifference || 0;
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch device auths');
    } finally {
      isFetching = false;
    }
  }

  async function generateDeviceAuth() {
    isGenerating = true;

    toast.promise(DeviceAuthManager.create(activeAccount), {
      loading: 'Generating device auth...',
      success: (deviceAuth) => {
        deviceAuths = [deviceAuth, ...deviceAuths];
        return `Device auth generated: ${deviceAuth.deviceId}`;
      },
      error: (error) => {
        console.error(error);
        return 'Failed to generate device auth';
      },
      finally: () => {
        isGenerating = false;
      }
    });
  }

  async function deleteDeviceAuth(deviceId: string) {
    isDeleting = true;

    toast.promise(DeviceAuthManager.delete(activeAccount, deviceId), {
      loading: 'Deleting device auth...',
      success: () => {
        deviceAuths = deviceAuths.filter((auth) => auth.deviceId !== deviceId);
        return 'Device auth deleted';
      },
      error: (error) => {
        console.error(error);
        return 'Failed to delete device auth';
      },
      finally: () => {
        isDeleting = false;
      }
    });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    });
  }

  onMount(() => {
    DataStorage.getDeviceAuthsFile().then((settings) => {
      deviceAuthsSettings = settings;
    });

    fetchDeviceAuths();

    return () => {
      for (const timeoutId of deviceNameTimeouts.values()) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

<div class="flex flex-col p-6 gap-8 max-w-2xl mx-auto bg-background rounded-lg">
  <div class="border rounded-md p-6">
    <div class="flex flex-col mb-6">
      <h2 class="text-2xl font-bold mb-4 flex items-center gap-x-3">
        Device Auth List
        <RefreshCwIcon
          class="size-6 cursor-pointer {isFetching ? 'animate-spin opacity-50 cursor-not-allowed' : ''}"
          onclick={fetchDeviceAuths}
        />
      </h2>

      <Button
        class="w-fit"
        disabled={isGenerating}
        onclick={generateDeviceAuth}
        variant="epic"
      >
        Generate Device Auth
      </Button>
    </div>

    {#if !isFetching}
      <div class="space-y-4">
        {#each deviceAuths as auth (auth.deviceId)}
          <div class="border border-input rounded-md p-4">
            <div class="flex justify-between items-start">
              <div class="flex flex-col gap-y-1">
                <div class="flex items-center gap-2 group w-fit mb-1">
                  <PencilLineIcon class="hidden group-hover:block size-5 cursor-pointer"/>
                  <span
                    class="font-semibold outline-none hover:underline"
                    contenteditable
                    onblur={(event) => handleBlur(event, auth.deviceId)}
                    oninput={(event) => handleDeviceNameInput(auth.deviceId, event)}
                    onkeydown={(event) => event.key === 'Enter' && event.preventDefault()}
                    role="textbox"
                    spellcheck="false"
                    tabindex="0"
                  >
                    {deviceAuthsSettings?.find(x => x.deviceId === auth.deviceId)?.customName || 'No Name'}
                  </span>
                </div>

                <span class="text-sm flex flex-col">
                  <span class="font-semibold">ID:</span>
                  <span class="text-muted-foreground">{auth.deviceId}</span>
                </span>

                <span class="text-sm flex flex-col">
                  <span class="font-semibold">User-Agent:</span>
                  <span class="text-muted-foreground">{auth.userAgent}</span>
                </span>

                {#if auth.created}
                  <div>
                    <span class="font-semibold">Created:</span>
                    <ul class="list-disc pl-5">
                      <li>
                        <span class="text-sm font-semibold">Date:</span>
                        <span class="text-sm text-muted-foreground">{auth.created.location}</span>
                      </li>
                      <li>
                        <span class="text-sm font-semibold">IP:</span>
                        <span class="text-sm text-muted-foreground">{auth.created.ipAddress}</span>
                      </li>
                      <li>
                        <span class="text-sm font-semibold">Date:</span>
                        <span class="text-sm text-muted-foreground">{formatDate(auth.created.dateTime)}</span>
                      </li>
                    </ul>
                  </div>
                {/if}

                {#if auth.lastAccess}
                  <div>
                    <span class="font-semibold">Last Access:</span>
                    <ul class="list-disc pl-5">
                      <li>
                        <span class="text-sm font-semibold">Date:</span>
                        <span class="text-sm text-muted-foreground">{auth.lastAccess.location}</span>
                      </li>
                      <li>
                        <span class="text-sm font-semibold">IP:</span>
                        <span class="text-sm text-muted-foreground">{auth.lastAccess.ipAddress}</span>
                      </li>
                      <li>
                        <span class="text-sm font-semibold">Date:</span>
                        <span class="text-sm text-muted-foreground">{formatDate(auth.lastAccess.dateTime)}</span>
                      </li>
                    </ul>
                  </div>
                {/if}
              </div>

              <Button
                class="p-2 flex"
                disabled={isDeleting}
                onclick={() => deleteDeviceAuth(auth.deviceId)}
                size="sm"
                variant="danger"
              >
                <Trash2Icon class="size-5"/>
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>