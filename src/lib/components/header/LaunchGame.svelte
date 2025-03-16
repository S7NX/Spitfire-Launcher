<script lang="ts">
  import Manifest from '$lib/core/manifest';
  import Authentication from '$lib/core/authentication';
  import GamePad2Icon from 'lucide-svelte/icons/gamepad-2';
  import { Command } from '@tauri-apps/plugin-shell';
  import Button from '$components/ui/Button.svelte';
  import { toast } from 'svelte-sonner';
  import { accountsStore } from '$lib/stores';
  import DataStorage from '$lib/core/dataStorage';
  import { exists } from '@tauri-apps/plugin-fs';
  import { path } from '@tauri-apps/api';
  import { launcherAppClient2 } from '$lib/constants/clients';
  import { shouldErrorBeIgnored } from '$lib/utils';

  const activeAccount = $derived($accountsStore.activeAccount);

  let launchButtonDisabled = $state(false);

  async function launchGame() {
    launchButtonDisabled = true;
    const toastId = toast.loading('Launching Fortnite...');

    try {
      const userSettings = await DataStorage.getSettingsFile();
      const manifestData = await Manifest.getData();
      const executableDirectory = userSettings?.app?.gamePath ||
        manifestData?.executableLocation.split('/').slice(0, -1).join('/').replace(/\//g, '/');

      const gameExistsInPath = executableDirectory && await exists(
        await path.join(executableDirectory, 'FortniteLauncher.exe')
      );

      if (!manifestData || !executableDirectory || !gameExistsInPath) {
        toast.error('Fortnite is not installed. Please install it first.', { id: toastId });
        return;
      }

      const deviceAuthResponse = await Authentication.getAccessTokenUsingDeviceAuth(activeAccount!);
      const oldExchangeData = await Authentication.getExchangeCodeUsingAccessToken(deviceAuthResponse.access_token);
      const launcherAccessTokenData = await Authentication.getAccessTokenUsingExchangeCode(oldExchangeData.code, launcherAppClient2);
      const launcherExchangeData = await Authentication.getExchangeCodeUsingAccessToken(launcherAccessTokenData.access_token);

      const args = [
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
      ];

      await Command.create('start-fortnite', args, {
        cwd: executableDirectory
      }).execute();

      toast.success('Fortnite launched successfully', { id: toastId });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to launch Fortnite', { id: toastId });
    } finally {
      launchButtonDisabled = false;
    }
  }
</script>

<Button
  class="flex items-center justify-center shrink-0"
  disabled={launchButtonDisabled || !activeAccount}
  onclick={launchGame}
  size="md"
  variant="epic"
>
  <span class="hidden xs:block">Launch Game</span>
  <GamePad2Icon class="size-6 xs:hidden block"/>
</Button>