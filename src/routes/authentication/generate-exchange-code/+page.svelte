<script lang="ts" module>
  let generatingExchangeCode = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored, t } from '$lib/utils/util';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  async function openEpicGamesWebsite() {
    generatingExchangeCode = true;

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await writeText(code);
      toast.success($t('exchangeCodeManagement.generated'));
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error($t('exchangeCodeManagement.failedToGenerate'));
    } finally {
      generatingExchangeCode = false;
    }
  }
</script>

<CenteredPageContent
  description={$t('exchangeCodeManagement.page.description')}
  title={$t('exchangeCodeManagement.page.title')}
>
  <Button
    disabled={generatingExchangeCode}
    loading={generatingExchangeCode}
    loadingText={$t('exchangeCodeManagement.generating')}
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    {$t('exchangeCodeManagement.generate')}
  </Button>
</CenteredPageContent>
