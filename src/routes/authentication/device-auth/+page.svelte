<script lang="ts" module>
  import type { EpicDeviceAuthData } from '$types/game/authorizations';

  let allDeviceAuths = $state<Record<string, EpicDeviceAuthData[]>>({});
  let isFetching = $state(false);
  let isGenerating = $state(false);
  let isDeleting = $state(false);
</script>

<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import { Separator } from 'bits-ui';
  import RefreshCwIcon from 'lucide-svelte/icons/refresh-cw';
  import PlusIcon from 'lucide-svelte/icons/plus';
  import Trash2Icon from 'lucide-svelte/icons/trash-2';
  import PencilIcon from 'lucide-svelte/icons/pencil';
  import { toast } from 'svelte-sonner';
  import DeviceAuthManager from '$lib/core/managers/deviceAuth';
  import type { DeviceAuthsSettings } from '$types/settings';
  import { onMount } from 'svelte';
  import DataStorage, { DEVICE_AUTHS_FILE_PATH } from '$lib/core/dataStorage';
  import { accountsStore } from '$lib/stores';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import Account from '$lib/core/account';
  import Tooltip from '$components/ui/Tooltip.svelte';
  import { goto } from '$app/navigation';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  const deviceAuths = $derived(allDeviceAuths[activeAccount.accountId]);

  $effect(() => {
    fetchDeviceAuths();
  });

  const deviceNameTimeouts = new Map<string, number>();
  let deviceAuthsSettings = $state<DeviceAuthsSettings>();

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

    const timeoutId = window.setTimeout(() => {
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

  async function fetchDeviceAuths(force = false) {
    if (isFetching) return;
    if (!force && deviceAuths?.length) return;

    isFetching = true;

    try {
      const data = await DeviceAuthManager.getAll(activeAccount);
      allDeviceAuths[activeAccount.accountId] = data.sort((a, b) => {
        const aHasCustomName = deviceAuthsSettings?.some(x => x.deviceId === a.deviceId) ? 1 : 0;
        const bHasCustomName = deviceAuthsSettings?.some(x => x.deviceId === b.deviceId) ? 1 : 0;
        const hasCustomName = bHasCustomName - aHasCustomName;

        const aDate = a.lastAccess?.dateTime || a.created?.dateTime;
        const bDate = b.lastAccess?.dateTime || b.created?.dateTime;
        const dateDifference = aDate && bDate && new Date(bDate).getTime() - new Date(aDate).getTime();

        return hasCustomName || dateDifference || 0;
      });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to fetch device auths');
    } finally {
      isFetching = false;
    }
  }

  async function generateDeviceAuth() {
    if (isGenerating) return;

    isGenerating = true;

    toast.promise(DeviceAuthManager.create(activeAccount), {
      loading: 'Generating device auth...',
      success: (deviceAuth) => {
        allDeviceAuths[activeAccount.accountId] = [deviceAuth, ...deviceAuths];
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

    const toastId = toast.loading('Deleting device auth...');
    const isCurrentDevice = deviceId === activeAccount.deviceId;

    try {
      await DeviceAuthManager.delete(activeAccount, deviceId);
      allDeviceAuths[activeAccount.accountId] = deviceAuths.filter((auth) => auth.deviceId !== deviceId);
      toast.success(`Device auth deleted ${isCurrentDevice ? 'and logged out' : ''}`, { id: toastId });

      if (isCurrentDevice) {
        await Account.logout();
        allDeviceAuths[activeAccount.accountId] = [];
        await goto('/');
      }

    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to delete device auth', { id: toastId });
    } finally {
      isDeleting = false;
    }
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
  <div class="border rounded-md space-y-4 p-6">
    <div class="flex flex-col">
      <div class="flex items-center gap-x-3">
        <h2 class="text-2xl font-bold">Device Auth List</h2>

        <PlusIcon
          class="size-8 cursor-pointer {isGenerating ? 'opacity-50 !cursor-not-allowed' : ''}"
          onclick={generateDeviceAuth}
        />

        <Separator.Root class="bg-border h-8 w-px"/>

        <RefreshCwIcon
          class="size-6 cursor-pointer {isFetching ? 'animate-spin opacity-50 !cursor-not-allowed' : ''}"
          onclick={() => fetchDeviceAuths(true)}
        />
      </div>
    </div>

    {#if !isFetching}
      <div class="space-y-4">
        {#each deviceAuths as auth (auth.deviceId)}
          <div class="border border-input rounded-md p-4">
            <div class="flex justify-between items-start">
              <div class="flex flex-col gap-y-1">
                <div class="flex items-center gap-2 w-fit mb-1">
                  <div class="flex items-center gap-2 group">
                    <PencilIcon class="hidden group-hover:block size-4"/>
                    <span
                      class="font-semibold outline-none hover:underline underline-offset-2"
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

                  {#if auth.deviceId === activeAccount.deviceId}
                    <Tooltip tooltip="The launcher uses this device auth">
                      <div class="size-2 bg-green-500 rounded-full shrink-0"></div>
                    </Tooltip>
                  {/if}
                </div>

                <div class="flex flex-col gap-y-2">
                  {#each [
                    { title: 'ID', value: auth.deviceId },
                    { title: 'User-Agent', value: auth.userAgent },
                    { title: 'Secret', value: auth.secret }
                  ] as { title, value } (title)}
                    {#if value}
                      <span class="text-sm flex flex-col">
                        <span class="font-semibold">{title}</span>
                        <span class="text-muted-foreground">{value}</span>
                      </span>
                    {/if}
                  {/each}

                  {#each [
                    { title: 'Created', data: auth.created },
                    { title: 'Last Access', data: auth.lastAccess }
                  ] as { title, data } (title)}
                    {#if data}
                      <div>
                        <span class="font-semibold">{title}</span>
                        <div>
                          <span class="text-sm font-semibold">Location:</span>
                          <span class="text-sm text-muted-foreground">{data.location}</span>
                        </div>
                        <div>
                          <span class="text-sm font-semibold">IP:</span>
                          <span class="text-sm text-muted-foreground">{data.ipAddress}</span>
                        </div>
                        <div>
                          <span class="text-sm font-semibold">Date:</span>
                          <span class="text-sm text-muted-foreground">{formatDate(data.dateTime)}</span>
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
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