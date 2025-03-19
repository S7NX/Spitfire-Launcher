<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import { writeText } from '@tauri-apps/plugin-clipboard-manager';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let generateButtonDisabled = $state(false);

  async function openEpicGamesWebsite() {
    generateButtonDisabled = true;

    const toastId = toast.loading('Generating an exchange code...');

    try {
      const accessToken = await Authentication.verifyOrRefreshAccessToken(activeAccount);
      const { code } = await Authentication.getExchangeCodeUsingAccessToken(accessToken);

      await writeText(code);
      toast.success('Generated and copied to clipboard', { id: toastId });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to generate an exchange code', { id: toastId });
    } finally {
      generateButtonDisabled = false;
    }
  }
</script>

<CenteredPageContent description="Click the button below to generate an exchange code." title="Exchange Code">
  <Button
    disabled={generateButtonDisabled}
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    Generate Exchange Code
  </Button>
</CenteredPageContent>