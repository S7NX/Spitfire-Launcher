<script lang="ts" module>
  let isLoggingIn = $state(false);
</script>

<script lang="ts">
  import PageContent from '$components/PageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { accountsStore } from '$lib/stores';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored, t } from '$lib/utils/util';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  async function openEpicGamesWebsite() {
    isLoggingIn = true;

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code: exchangeCode } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await openUrl(`https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`);
      toast.success($t('epicGamesSettings.openedWebsite'));
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error($t('epicGamesSettings.failedToOpenWebsite'));
    } finally {
      isLoggingIn = false;
    }
  }
</script>

<PageContent
  description={$t('epicGamesSettings.page.description')}
  small={true}
  title={$t('epicGamesSettings.page.title')}
>
  <Button
    disabled={isLoggingIn}
    loading={isLoggingIn}
    loadingText={$t('epicGamesSettings.loggingIn')}
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    {$t('epicGamesSettings.login')}
  </Button>
</PageContent>
