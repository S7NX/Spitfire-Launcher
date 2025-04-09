<script lang="ts" module>
  import { SvelteSet } from 'svelte/reactivity';

  let statusSetAccounts = new SvelteSet<string>();
  let isSettingStatus = $state(false);
  let isResettingStatus = $state(false);
</script>

<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import CustomStatusTutorial from '$components/docs/tutorials/CustomStatus.svelte';
  import BotLobbyManager from '$lib/core/managers/automation/botLobbyManager.svelte';
  import TaxiManager from '$lib/core/managers/automation/taxiManager.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import XMPPManager from '$lib/core/managers/xmpp';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));
  const isCustomStatusInUse = $derived(TaxiManager.taxiAccountIds.has(activeAccount.accountId) || BotLobbyManager.botLobbyAccountIds.has(activeAccount.accountId));
  let customStatus = $state<string>();

  async function setCustomStatus(event: SubmitEvent) {
    event.preventDefault();

    if (!customStatus?.trim()) {
      toast.error('Please enter a custom status');
      return;
    }

    isSettingStatus = true;

    try {
      const connection = await XMPPManager.create(activeAccount, 'customStatus');
      await connection.connect();

      connection.setStatus(customStatus);
      statusSetAccounts.add(activeAccount.accountId);

      toast.success('Custom status set successfully');
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to set custom status');
    } finally {
      isSettingStatus = false;
    }
  }

  async function resetStatus() {
    isResettingStatus = true;

    try {
      const connection = await XMPPManager.create(activeAccount, 'customStatus');
      await connection.connect();

      connection.setStatus('');
      connection.removePurpose('customStatus');
      statusSetAccounts.delete(activeAccount.accountId);

      toast.success('Custom status reset successfully');
    } catch (error) {
      if (shouldErrorBeIgnored(error)) return;

      console.error(error);
      toast.error('Failed to reset custom status');
    } finally {
      isResettingStatus = false;
    }
  }
</script>

<CenteredPageContent
  description="Set a custom status that will be displayed to your friends."
  docsComponent={CustomStatusTutorial}
  title="Custom Status"
>
  <form class="flex flex-col gap-y-4" onsubmit={setCustomStatus}>
    <Input
      disabled={isCustomStatusInUse}
      placeholder="Enter your custom status"
      bind:value={customStatus}
    />

    <Button
      disabled={isSettingStatus || !customStatus?.trim() || isCustomStatusInUse}
      loading={isSettingStatus}
      loadingText="Setting Status"
      type="submit"
      variant="epic"
    >
      Set Status
    </Button>

    <Button
      disabled={isResettingStatus || !statusSetAccounts.has(activeAccount.accountId)}
      loading={isResettingStatus}
      loadingText="Resetting Status"
      onclick={resetStatus}
      type="button"
      variant="epic"
    >
      Reset Status
    </Button>
  </form>
</CenteredPageContent>