<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { platform } from '@tauri-apps/plugin-os';
  import LaunchGame from '$components/header/LaunchGame.svelte';
  import AccountSwitcher from '$components/header/AccountSwitcher.svelte';
  import ThemeSwitcher from '$components/header/ThemeSwitcher.svelte';
  import SettingsModal from '$components/settings/SettingsModal.svelte';
  import MenuIcon from 'lucide-svelte/icons/menu';
  import MinusIcon from 'lucide-svelte/icons/minus';
  import XIcon from 'lucide-svelte/icons/x';
  import { sidebarOpen } from '$components/Sidebar.svelte';

  const appWindow = getCurrentWindow();
  const currentPlatform = platform();
  const isMobile = currentPlatform === 'android' || currentPlatform === 'ios';

  async function minimize() {
    await appWindow.minimize();
  }

  async function close() {
    await appWindow.close();
  }

  function toggleSidebar() {
    sidebarOpen.update(value => !value);
  }
</script>

<header
  class="h-16 bg-surface-alt border-b border-border flex items-center justify-between md:justify-end px-4 select-none sticky top-0 z-10"
  data-tauri-drag-region>

  <div class="flex items-center space-x-2">
    <button
      class="p-2 bg-accent rounded transition-colors duration-200 md:hidden {$sidebarOpen ? 'bg-accent' : ''}"
      onclick={toggleSidebar}
    >
      <MenuIcon class="size-6"/>
    </button>

    {#if currentPlatform === 'windows'}
      <LaunchGame/>
    {/if}

    <AccountSwitcher/>
    <ThemeSwitcher/>
    <SettingsModal/>
  </div>

  {#if !isMobile}
    <div class="flex items-center space-x-2">
      <button class="p-2 hover:bg-accent rounded transition-colors duration-200" onclick={minimize}>
        <MinusIcon/>
      </button>
      <button class="p-2 hover:bg-red-500/80 hover:text-white rounded transition-colors duration-200" onclick={close}>
        <XIcon/>
      </button>
    </div>
  {/if}
</header>