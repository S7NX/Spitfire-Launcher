<script lang="ts">
  import MenuIcon from 'lucide-svelte/icons/menu';
  import { sidebarOpen } from '$components/Sidebar.svelte';

  function toggleSidebar() {
    sidebarOpen.update(value => !value);
  }
</script>

<button
  class="p-2 rounded hover:bg-accent transition-colors duration-200 md:hidden {$sidebarOpen ? 'bg-accent' : ''}"
  onclick={toggleSidebar}
>
  <MenuIcon class="size-6"/>
</button>