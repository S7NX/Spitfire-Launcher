<script lang="ts">
  import { theme } from '$lib/stores';
  import MoonIcon from 'lucide-svelte/icons/moon';
  import SunIcon from 'lucide-svelte/icons/sun';

  function toggleTheme() {
    theme.set($theme === 'dark' ? 'light' : 'dark');
  }
</script>

<button
  class="p-2 rounded-md hover:bg-accent transition-colors"
  onclick={toggleTheme}
>
  {#if $theme === 'dark'}
    <SunIcon/>
  {:else}
    <MoonIcon/>
  {/if}
</button>