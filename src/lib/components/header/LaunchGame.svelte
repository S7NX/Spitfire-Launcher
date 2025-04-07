<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import { launcherAppClient2 } from '$lib/constants/clients';
  import Authentication from '$lib/core/authentication';
  import DataStorage from '$lib/core/dataStorage';
  import Manifest from '$lib/core/manifest';
  import Process from '$lib/core/system/process';
  import { accountsStore } from '$lib/stores';
  import { shouldErrorBeIgnored } from '$lib/utils';
  import { path } from '@tauri-apps/api';
  import { exists } from '@tauri-apps/plugin-fs';
  import { Command } from '@tauri-apps/plugin-shell';
  import GamePad2Icon from 'lucide-svelte/icons/gamepad-2';
  import CircleStopIcon from 'lucide-svelte/icons/circle-stop';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';

  const activeAccount = $derived($accountsStore.activeAccount);

  let isAuthenticating = $state(false);
  let isGameLaunched = $state(false);
  let isGameRunning = $state(false);

  async function launchGame() {
    await checkIsRunning();

    if (isGameRunning) {
      toast.error('Fortnite is already running');
      return;
    }

    const toastId = toast.loading('Launching Fortnite...');

    try {
      isAuthenticating = true;

      const userSettings = await DataStorage.getSettingsFile();
      const manifestData = await Manifest.getData();
      const executableDirectory = userSettings?.app?.gamePath || manifestData?.executableLocation.split('/').slice(0, -1).join('/').replace(/\//g, '/');
      const gameExistsInPath = executableDirectory && await exists(await path.join(executableDirectory, 'FortniteLauncher.exe'));
      if (!manifestData || !executableDirectory || !gameExistsInPath) {
        toast.error('Fortnite is not installed. Please install it first.', { id: toastId });
        return;
      }

      const deviceAuthResponse = await Authentication.getAccessTokenUsingDeviceAuth(activeAccount!);
      const oldExchangeData = await Authentication.getExchangeCodeUsingAccessToken(deviceAuthResponse.access_token);
      const launcherAccessTokenData = await Authentication.getAccessTokenUsingExchangeCode(oldExchangeData.code, launcherAppClient2);
      const launcherExchangeData = await Authentication.getExchangeCodeUsingAccessToken(launcherAccessTokenData.access_token);

      isAuthenticating = false;
      isGameLaunched = true;

      await Command.create(
        'start-fortnite',
        [
          '/c',
          'start',
          'FortniteLauncher.exe',
          '-AUTH_LOGIN=unused',
          `-AUTH_PASSWORD=${launcherExchangeData.code}`,
          '-AUTH_TYPE=exchangecode',
          '-epicapp=Fortnite',
          '-epicenv=Prod',
          '-EpicPortal',
          `-epicuserid=${activeAccount!.accountId}`
        ],
        {
          cwd: executableDirectory
        }).execute();
    } catch (error) {
      isGameLaunched = false;
      isAuthenticating = false;

      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to launch Fortnite', { id: toastId });
    } finally {
      isAuthenticating = false;
    }
  }

  async function stopGame() {
    const toastId = toast.loading('Stopping Fortnite...');

    try {
      const result = await Command.create('kill-fortnite').execute();
      if (result.stderr) throw new Error(result.stderr);

      isGameLaunched = false;
      isGameRunning = false;
      toast.success('Fortnite stopped successfully', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to stop Fortnite', { id: toastId });
    }
  }

  async function checkIsRunning() {
    const wasRunning = isGameRunning;
    const processes = await Process.getProcesses();
    isGameRunning = processes.some(process => process.name === 'FortniteClient-Win64-Shipping.exe');

    if (!wasRunning && isGameRunning && isGameLaunched) {
      toast.success('Fortnite launched successfully');
    }
  }

  onMount(() => {
    checkIsRunning();

    const interval = setInterval(() => {
      checkIsRunning();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<Button
  class="flex items-center justify-center shrink-0"
  disabled={!activeAccount || isAuthenticating || (isGameLaunched && !isGameRunning)}
  onclick={() => isGameRunning ? stopGame() : launchGame()}
  size="md"
  variant={isGameRunning ? 'danger' : 'epic'}
>
  {#if isGameRunning}
    <span class="hidden xs:block">Stop Fortnite</span>
    <CircleStopIcon class="size-6 xs:hidden block"/>
  {:else}
    <span class="hidden xs:block">Launch Fortnite</span>
    <GamePad2Icon class="size-6 xs:hidden block"/>
  {/if}
</Button>