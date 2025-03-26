<script lang="ts" module>
  let generatingExchangeCode = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  async function openEpicGamesWebsite() {
    generatingExchangeCode = true;

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await writeText(code);
      toast.success('Generated and copied to clipboard');
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to generate an exchange code');
    } finally {
      generatingExchangeCode = false;
    }
  }
</script>

<CenteredPageContent description="Click the button below to generate an exchange code." title="Exchange Code">
  <Button
    disabled={generatingExchangeCode}
    loading={generatingExchangeCode}
    loadingText="Generating"
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    Generate exchange code
  </Button>
</CenteredPageContent>