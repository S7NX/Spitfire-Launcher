<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { accountsStore } from '$lib/stores';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let loginButtonDisabled = $state(false);

  async function openEpicGamesWebsite() {
    loginButtonDisabled = true;

    const toastId = toast.loading('Opening Epic Games website...');

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code: exchangeCode } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await openUrl(`https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`);
      toast.success('Opened Epic Games website', { id: toastId });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to open Epic Games website', { id: toastId });
    } finally {
      loginButtonDisabled = false;
    }
  }
</script>

<CenteredPageContent>
  <div class="flex flex-col gap-y-2">
    <h2 class="text-lg font-medium">Epic Games Settings</h2>

    <span class="text-sm font-medium text-muted-foreground">
      Click the button below to login to Epic Games.
    </span>
  </div>

  <Button
    disabled={loginButtonDisabled}
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    Login to Epic Games website
  </Button>
</CenteredPageContent>