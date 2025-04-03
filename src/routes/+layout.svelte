<script lang="ts">
  import '../app.css';
  import 'webrtc-adapter';
  import Sidebar from '$components/Sidebar.svelte';
  import Header from '$components/header/Header.svelte';
  import ScrollArea from '$components/ui/ScrollArea.svelte';
  import { Toaster } from 'svelte-sonner';
  import { onMount } from 'svelte';
  import packageJson from '../../package.json';
  import ky from 'ky';
  import config from '$lib/config';
  import type { GitHubRelease } from '$types/github';
  import Button from '$components/ui/Button.svelte';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import Dialog from '$components/ui/Dialog.svelte';
  import DataStorage from '$lib/core/dataStorage';
  import { Tooltip } from 'bits-ui';
  import WorldInfoManager from '$lib/core/managers/worldInfo';
  import { worldInfoCache } from '$lib/stores';
  import AutoKickBase from '$lib/core/managers/automation/autoKickBase';

  const { children } = $props();

  let newVersionData = $state<{ tag: string; downloadUrl: string; }>();

  function disableF5(e: KeyboardEvent) {
    // Using CTRL + R to refresh the page is allowed
    if (e.key === 'F5') e.preventDefault();
  }

  async function handleWorldInfo() {
    const worldInfoData = await WorldInfoManager.getWorldInfoData();
    const parsedWorldInfo = WorldInfoManager.parseWorldInfo(worldInfoData);
    worldInfoCache.set(parsedWorldInfo);
  }

  async function checkForUpdates() {
    const settings = await DataStorage.getSettingsFile();
    if (!settings.app?.checkForUpdates) return;

    const { owner, name } = config.repository;
    const url = `https://api.github.com/repos/${owner}/${name}/releases/latest`;

    const latestVersion = await ky.get<GitHubRelease>(url).json();

    if (latestVersion.tag_name !== `v${packageJson.version}`) {
      newVersionData = {
        tag: latestVersion.tag_name.replace('v', ''),
        downloadUrl: latestVersion.html_url
      };
    }
  }

  onMount(() => {
    document.addEventListener('keydown', disableF5);

    Promise.allSettled([
      AutoKickBase.loadAccounts(),
      handleWorldInfo(),
      checkForUpdates()
    ]);
  });
</script>

<div class="min-h-[100dvh] flex flex-row">
  <Tooltip.Provider>
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3000,
        unstyled: true,
        classes: {
          toast: 'bg-secondary flex items-center px-4 py-4 border rounded-lg gap-3 min-w-96',
          title: 'text-sm'
        }
      }}
    />
    <Sidebar/>
    <div class="flex flex-col flex-1">
      <Header/>
      <ScrollArea>
        <main class="p-4 flex-1 overflow-auto bg-background h-[calc(100vh-4rem)]">
          {@render children()}
        </main>
      </ScrollArea>
    </div>
  </Tooltip.Provider>
</div>

<Dialog bind:open={() => !!newVersionData, () => newVersionData = undefined}>
  {#snippet title()}
    New version available
  {/snippet}

  {#snippet description()}
    Version {newVersionData?.tag} is available. Click the button below to download it.
  {/snippet}

  <Button
    class="flex gap-2 justify-center items-center w-fit"
    href={newVersionData?.downloadUrl}
  >
    <ExternalLinkIcon class="size-5"/>
    Download
  </Button>
</Dialog>