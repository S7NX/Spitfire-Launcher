<script lang="ts">
  import Button from '$components/ui/Button.svelte';
  import { DropdownMenu } from '$components/ui/DropdownMenu';
  import { launcherAppClient2 } from '$lib/constants/clients';
  import Authentication from '$lib/core/authentication';
  import DataStorage from '$lib/core/dataStorage';
  import Manifest from '$lib/core/manifest';
  import Process from '$lib/core/system/process';
  import { accountsStore } from '$lib/stores';
  import { shouldErrorBeIgnored, t } from '$lib/utils/util';
  import { path } from '@tauri-apps/api';
  import { exists } from '@tauri-apps/plugin-fs';
  import { Command } from '@tauri-apps/plugin-shell';
  import GamePad2Icon from 'lucide-svelte/icons/gamepad-2';
  import CircleStopIcon from 'lucide-svelte/icons/circle-stop';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { SvelteSet } from 'svelte/reactivity';

  const activeAccount = $derived($accountsStore.activeAccount);

  const processes = [
    { id: 'fortnite', launchExe: 'FortniteLauncher.exe', runningExe: 'FortniteClient-Win64-Shipping.exe' },
    { id: 'unrealEditorForFortnite', launchExe: 'UnrealEditorFortnite-Win64-Shipping.exe', runningExe: 'UnrealEditorFortnite-Win64-Shipping.exe' },
    { id: 'fallGuys', launchExe: 'RunFallGuys.exe', runningExe: 'FallGuys_client_game.exe' },
    { id: 'rocketLeague', launchExe: 'RocketLeague.exe', runningExe: 'RocketLeague.exe' }
  ] as const;

  type ProcessId = typeof processes[number]['id'];

  let authenticatingProcesses = new SvelteSet<ProcessId>();
  let launchingProcesses = new SvelteSet<ProcessId>();
  let runningProccesses = new SvelteSet<ProcessId>();

  let isDropdownOpen = $state(false);
  let dropdownAnchor = $state<HTMLElement>();

  async function launchProcess(id: ProcessId) {
    await checkRunningProcesses();

    if (runningProccesses.has(id)) {
      toast.error($t('launchGame.alreadyRunning'));
      return;
    }

    const toastId = toast.loading($t('launchGame.launching'));
    const processData = processes.find((process) => process.id === id)!;

    try {
      authenticatingProcesses.add(id);

      const userSettings = await DataStorage.getSettingsFile();
      const customPath = id === 'fortnite' && userSettings?.app?.gamePath;
      const manifestData = await Manifest.getAppData(id);
      const executableLocation = (customPath ? await path.join(customPath, 'FortniteLauncher.exe') : manifestData?.executableLocation)?.replaceAll('\\', '/');
      const gameExistsInPath = executableLocation && await exists(executableLocation);
      if (!manifestData || !gameExistsInPath) {
        toast.error($t('launchGame.notInstalled'), { id: toastId });
        return;
      }

      const executableDirectory = executableLocation.split('/').slice(0, -1).join('/').replace(/\//g, '/');

      const deviceAuthResponse = await Authentication.getAccessTokenUsingDeviceAuth(activeAccount!);
      const oldExchangeData = await Authentication.getExchangeCodeUsingAccessToken(deviceAuthResponse.access_token);
      const launcherAccessTokenData = await Authentication.getAccessTokenUsingExchangeCode(oldExchangeData.code, launcherAppClient2);
      const launcherExchangeData = await Authentication.getExchangeCodeUsingAccessToken(launcherAccessTokenData.access_token);

      authenticatingProcesses.delete(id);
      launchingProcesses.add(id);

      await Command.create(
        'start-epic-app',
        [
          '/c',
          'start',
          processData.launchExe,
          '-AUTH_LOGIN=unused',
          `-AUTH_PASSWORD=${launcherExchangeData.code}`,
          '-AUTH_TYPE=exchangecode',
          '-EpicPortal',
          `-epicuserid=${activeAccount!.accountId}`
        ],
        { cwd: executableDirectory }
      ).execute();
    } catch (error) {
      launchingProcesses.delete(id);
      authenticatingProcesses.delete(id);

      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error($t('launchGame.failedToLaunch'), { id: toastId });
    } finally {
      authenticatingProcesses.delete(id);
    }
  }

  async function stopProcess(id: ProcessId) {
    const toastId = toast.loading($t('launchGame.stopping'));
    const processData = processes.find((process) => process.id === id)!;
    const baseArgs = ['taskkill', '/IM'];

    try {
      const result = await Command.create('kill-epic-app', [...baseArgs, processData.runningExe]).execute();

      if (result.stderr) throw new Error(result.stderr);

      launchingProcesses.delete(id);
      runningProccesses.delete(id);

      if (runningProccesses.size === 0) {
        Command.create('kill-epic-app', [...baseArgs, 'EasyAntiCheat_EOS.exe']).execute().catch(console.error);
        Command.create('kill-epic-app', [...baseArgs, 'FortniteClient-Win64-Shipping_EAC.exe']).execute().catch(console.error);
      }

      toast.success($t('launchGame.stopped'), { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error($t('launchGame.failedToStop'), { id: toastId });
    }
  }

  async function launchOrStopProcess(id: ProcessId) {
    if (runningProccesses.has(id)) {
      await stopProcess(id);
    } else {
      await launchProcess(id);
    }
  }

  async function checkRunningProcesses() {
    for (const process of processes) {
      const runningProcesses = await Process.getProcesses();
      const isRunning = runningProcesses.some((p) => p.name === process.runningExe);

      if (isRunning) {
        runningProccesses.add(process.id);
      } else {
        runningProccesses.delete(process.id);
      }
    }
  }

  onMount(() => {
    checkRunningProcesses();

    const interval = setInterval(() => {
      checkRunningProcesses();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div bind:this={dropdownAnchor}>
  <Button
    class="flex items-center justify-center shrink-0"
    disabled={!activeAccount || authenticatingProcesses.has('fortnite') || (launchingProcesses.has('fortnite') && !runningProccesses.has('fortnite'))}
    onclick={() => launchOrStopProcess('fortnite')}
    oncontextmenu={(e) => {
      e.preventDefault();
      isDropdownOpen = !isDropdownOpen;
    }}
    size="md"
    variant={runningProccesses.has('fortnite') ? 'danger' : 'epic'}
  >
    {#if runningProccesses.has('fortnite')}
      <span class="hidden xs:block">{$t('launchGame.stop')}</span>
      <CircleStopIcon class="size-6 xs:hidden block"/>
    {:else}
      <span class="hidden xs:block">{$t('launchGame.launch')}</span>
      <GamePad2Icon class="size-6 xs:hidden block"/>
    {/if}
  </Button>
</div>

<DropdownMenu.Root contentProps={{ customAnchor: dropdownAnchor }} bind:open={isDropdownOpen}>
  {#each processes.slice(1) as { id } (id)}
    {@const isRunning = runningProccesses.has(id)}
    {@const isAuthenticating = authenticatingProcesses.has(id)}
    {@const isLaunching = launchingProcesses.has(id)}

    <DropdownMenu.Item
      class="flex items-center gap-x-2"
      disabled={!activeAccount || isAuthenticating || (isLaunching && !isRunning)}
      onclick={() => launchOrStopProcess(id)}
    >
      {#if id === 'unrealEditorForFortnite'}
        <img class="size-6" alt="Unreal Engine" src="/assets/logos/unreal-engine-white.svg"/>
      {:else if id === 'rocketLeague'}
        <img class="size-6" alt="Rocket League" src="/assets/logos/rocket-league.png"/>
      {:else if id === 'fallGuys'}
        <img class="size-6" alt="Fall Guys" src="/assets/logos/fall-guys.png"/>
      {/if}

      {#if isRunning}
        <span class="font-medium">{$t(`launchGame.dropdown.${id}.stop` as any)}</span>
      {:else if isLaunching}
        <span class="font-medium">{$t('launchGame.dropdown.launching')}</span>
      {:else}
        <span class="font-medium">{$t(`launchGame.dropdown.${id}.launch` as any)}</span>
      {/if}
    </DropdownMenu.Item>
  {/each}
</DropdownMenu.Root>
