<script lang="ts" module>
  let isSettingStatus = $state(false);
</script>

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

  async function setCustomStatus(event: SubmitEvent) {
    event.preventDefault();

    if (!customStatus?.trim()) {
      toast.error('Please enter a custom status');
      return;
    }

    isSettingStatus = true;

    try {
      const accessTokenData = await Authentication.getAccessTokenUsingDeviceAuth(activeAccount, false);
      const connection = new XMPPManager({ accountId: activeAccount.accountId, accessToken: accessTokenData.access_token });
      await connection.connect();

      connection.setStatus(customStatus);

      toast.success('Custom status set successfully');
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to set custom status');
    } finally {
      isSettingStatus = false;
    }
  }
</script>

<CenteredPageContent description="Set a custom status that will be displayed to your friends. Restart the launcher to reset the status." title="Custom Status">
  <form class="flex flex-col gap-y-4" onsubmit={setCustomStatus}>
    <Input
      placeholder="Enter your custom status"
      bind:value={customStatus}
    />

    <Button
      disabled={isSettingStatus || !customStatus?.trim()}
      loading={isSettingStatus}
      loadingText="Setting Status"
      type="submit"
      variant="epic"
    >
      Set Status
    </Button>
  </form>
</CenteredPageContent>