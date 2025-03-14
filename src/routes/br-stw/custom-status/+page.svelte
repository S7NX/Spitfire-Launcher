<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import Authentication from '$lib/core/authentication';
  import XMPPManager from '$lib/core/managers/xmpp';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let customStatus = $state<string>();
  let setStatusButtonDisabled = $state(false);

  async function setCustomStatus() {
    if (!customStatus?.trim()) {
      toast.error('Please enter a custom status');
      return;
    }

    setStatusButtonDisabled = true;
    const toastId = toast.loading('Setting custom status...');

    try {
      const accessTokenData = await Authentication.getAccessTokenUsingDeviceAuth(activeAccount, false);
      const connection = new XMPPManager({ accountId: activeAccount.accountId, accessToken: accessTokenData.access_token });
      await connection.connect();

      connection.setStatus(customStatus);

      toast.success('Custom status set successfully', { id: toastId });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to set custom status', { id: toastId });
    } finally {
      setStatusButtonDisabled = false;
    }
  }
</script>

<CenteredPageContent>
  <div class="flex flex-col gap-y-2">
    <h2 class="text-lg font-medium">Custom Status</h2>

    <p class="text-sm text-muted-foreground">
      Set a custom status that will be displayed to your friends.
      <br> Restart the launcher to reset the status.
    </p>

    <Input
      placeholder="Enter your custom status"
      bind:value={customStatus}
    />

    <Button
      class="mt-2"
      disabled={setStatusButtonDisabled || !customStatus?.trim()}
      onclick={setCustomStatus}
      variant="epic"
    >
      Set Status
    </Button>
  </div>
</CenteredPageContent>