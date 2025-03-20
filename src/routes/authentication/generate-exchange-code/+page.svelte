<script lang="ts" module>
  let generatingExchangeCode = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
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
    class="flex justify-center items-center gap-x-2"
    disabled={generatingExchangeCode}
    onclick={openEpicGamesWebsite}
    variant="epic"
  >
    {#if generatingExchangeCode}
      <LoaderCircleIcon class="size-5 animate-spin"/>
      Generating
    {:else}
      Generate exchange code
    {/if}
  </Button>
</CenteredPageContent>