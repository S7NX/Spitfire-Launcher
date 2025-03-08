<script lang="ts">
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { toast } from 'svelte-sonner';
  import { nonNull } from '$lib/utils';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let generateButtonDisabled = $state(false);

  async function openEpicGamesWebsite() {
    generateButtonDisabled = true;

    const toastId = toast.loading('Generating an exchange code...');

    try {
      const { access_token } = await Authentication.verifyOrRefreshAccessToken(activeAccount);

      const { code } = await Authentication.getExchangeCodeUsingAccessToken(access_token);

      await navigator.clipboard.writeText(code);
      toast.success('Generated and copied to clipboard', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate an exchange code', { id: toastId });
    } finally {
      generateButtonDisabled = false;
    }
  }
</script>

<div class="flex flex-col items-center justify-center h-full">
  <div class="flex flex-col gap-4 w-96 p-5 border rounded-md">
    <span class="text-sm font-medium text-muted-foreground">
      Click the button below to generate an exchange code.
    </span>

    <Button
      disabled={generateButtonDisabled}
      onclick={openEpicGamesWebsite}
      variant="epic"
    >
      Generate Exchange Code
    </Button>
  </div>
</div>