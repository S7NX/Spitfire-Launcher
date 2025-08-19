<script lang="ts" module>
  let isLoggingIn = $state(false);
  let isCopying = $state(false);
</script>

<script lang="ts">
  import PageContent from '$components/PageContent.svelte';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { activeAccountStore } from '$lib/core/data-storage';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import { handleError, nonNull, t } from '$lib/utils/util';
  import CopyIcon from 'lucide-svelte/icons/copy';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';

  const activeAccount = $derived(nonNull($activeAccountStore));

  async function openEpicGamesWebsite() {
    isLoggingIn = true;

    try {
      const url = await generateLoginURL();
      await openUrl(url);

      toast.success($t('epicGamesWebsite.openedWebsite'));
    } catch (error) {
      handleError(error, $t('epicGamesWebsite.failedToOpenWebsite'));
    } finally {
      isLoggingIn = false;
    }
  }

  async function copyWebsiteLink() {
    isCopying = true;

    try {
      const url = await generateLoginURL();
      await writeText(url);

      toast.success($t('epicGamesWebsite.copied'));
    } catch (error) {
      handleError(error, $t('epicGamesWebsite.failedToCopy'));
    } finally {
      isCopying = false;
    }
  }

  async function generateLoginURL() {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
    const exchangeCodeData = await Authentication.getExchangeCodeUsingAccessToken(accessToken);
    return `https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCodeData.code}`;
  }
</script>

<PageContent
  description={$t('epicGamesWebsite.page.description')}
  small={true}
  title={$t('epicGamesWebsite.page.title')}
>
  <div class="flex items-center gap-2">
    <Button
      class="w-full"
      disabled={isLoggingIn || isCopying}
      loading={isLoggingIn}
      loadingText={$t('epicGamesWebsite.loggingIn')}
      onclick={openEpicGamesWebsite}
      variant="epic"
    >
      {$t('epicGamesWebsite.login')}
    </Button>

    <Button
      disabled={isLoggingIn || isCopying}
      onclick={copyWebsiteLink}
      variant="accent"
    >
      {#if isCopying}
        <LoaderCircleIcon class="size-5 animate-spin my-1"/>
      {:else}
        <CopyIcon class="size-5 my-1"/>
      {/if}
    </Button>
  </div>
</PageContent>
