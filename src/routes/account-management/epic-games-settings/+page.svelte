<script lang="ts">
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { nonNull } from '$lib/utils';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let loginButtonDisabled = $state(false);

  async function openEpicGamesWebsite() {
    loginButtonDisabled = true;

    const toastId = toast.loading('Opening Epic Games website...');

    try {
      const { access_token } = await Authentication.verifyOrRefreshAccessToken(activeAccount);

      const { code: exchangeCode } = await Authentication.getExchangeCodeUsingAccessToken(access_token);

      await openUrl(`https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`);
      toast.success('Opened Epic Games website', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to open Epic Games website', { id: toastId });
    } finally {
      loginButtonDisabled = false;
    }
  }
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class="flex flex-col gap-4 w-96 p-5 border rounded-md">
    <span class="text-sm font-medium text-muted-foreground">
      Click the button below to login to Epic Games.
    </span>
    <Button
      disabled={loginButtonDisabled}
      onclick={openEpicGamesWebsite}
      variant="epic"
    >
      Login to Epic Games website
    </Button>
  </div>
</div>