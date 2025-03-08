<script lang="ts">
  import '../app.css';
  import Sidebar from '$components/Sidebar.svelte';
  import Header from '$components/header/Header.svelte';
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
  import { getWorldInfoData, parseWorldInfo } from '$lib/core/stw/worldInfo';
  import { worldInfoCache } from '$lib/stores';
  import { dev } from '$app/environment';

  const { children } = $props();

  let newVersionTag = $state<string>();
  let downloadUrl = $state<string>();

  async function checkForUpdates() {
    const { owner, name } = config.repository;
    const url = `https://api.github.com/repos/${owner}/${name}/releases/latest`;

    const currentVersion = packageJson.version;
    const latestVersion = await ky.get<GitHubRelease>(url).json();

    if (latestVersion.tag_name !== `v${currentVersion}`) {
      newVersionTag = latestVersion.tag_name.replace('v', '');
      downloadUrl = latestVersion.html_url;
    }
  }

  function disableF5(e: KeyboardEvent) {
    // TODO: F5 prevents page data functions from being called, disabled until I find a better solution
    if (e.key === 'F5' && !dev) e.preventDefault();
  }

  onMount(async () => {
    const settings = await DataStorage.getSettingsFile();
    if (settings.app?.checkForUpdates) {
      await checkForUpdates();
    }

    const worldInfoData = await getWorldInfoData();
    const parsedWorldInfo = parseWorldInfo(worldInfoData);
    worldInfoCache.set(parsedWorldInfo);

    document.addEventListener('keydown', disableF5);
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
      <main class="p-4 flex-1 overflow-auto bg-background">
        {@render children()}
      </main>
    </div>
  </Tooltip.Provider>
</div>

<Dialog bind:open={() => !!newVersionTag, () => newVersionTag = ''}>
  {#snippet title()}
    New version available
  {/snippet}

  {#snippet description()}
    Version {newVersionTag} is available. Click the button below to download it.
  {/snippet}

  <Button
    class="flex gap-2 items-center w-fit"
    href={downloadUrl}
  >
    <ExternalLinkIcon class="size-4"/>
    Download
  </Button>
</Dialog>