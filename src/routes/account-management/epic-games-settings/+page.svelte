<script lang="ts" module>
  let isLoggingIn = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { accountsStore } from '$lib/stores';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  async function openEpicGamesWebsite() {
    isLoggingIn = true;

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code: exchangeCode } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await openUrl(`https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`);
      toast.success('Opened Epic Games website');
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to open Epic Games website');
    } finally {
      isLoggingIn = false;
    }
  }
</script>

<CenteredPageContent description="Click the button below to login to Epic Games." title="Epic Games Settings">
  <Button
    class="flex justify-center items-center gap-x-2"
    disabled={isLoggingIn}
    loading={isLoggingIn}
    loadingText="Logging in"
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    Login to Epic Games website
  </Button>
</CenteredPageContent>