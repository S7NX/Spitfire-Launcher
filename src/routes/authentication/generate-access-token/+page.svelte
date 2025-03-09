<script lang="ts">
  import CenteredPageContent from '$components/CenteredPageContent.svelte';
  import { accountsStore } from '$lib/stores';
  import Button from '$components/ui/Button.svelte';
  import Authentication from '$lib/core/authentication';
  import { toast } from 'svelte-sonner';
  import { nonNull, shouldErrorBeIgnored } from '$lib/utils';
  import Select from '$components/ui/Select.svelte';
  import KeyRound from 'lucide-svelte/icons/key-round';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import { defaultClient, fortniteAndroidGameClient, fortnitePCGameClient, launcherAppClient2 } from '$lib/constants/clients';

  const activeAccount = $derived(nonNull($accountsStore.activeAccount));

  let generateButtonDisabled = $state(false);

  let selectedTokenType = $state<'eg1' | 'bearer'>();
  const tokenTypeOptions = [
    { value: 'eg1', label: 'EG1' },
    { value: 'bearer', label: 'Bearer' }
  ];

  let selectedClient = $state<string>();
  const allClients = [fortniteAndroidGameClient, fortnitePCGameClient, launcherAppClient2];
  const clientOptions = allClients.map(client => ({ value: client.clientId, label: client.name }));

  async function generateAccessToken() {
    generateButtonDisabled = true;

    const toastId = toast.loading('Generating an access token...');

    try {
      let accessTokenData = await Authentication.verifyOrRefreshAccessToken(activeAccount);

      if (selectedClient !== defaultClient.clientId) {
        const { code } = await Authentication.getExchangeCodeUsingAccessToken(accessTokenData.access_token);

        const client = allClients.find(client => client.clientId === selectedClient);
        accessTokenData = await Authentication.getAccessTokenUsingExchangeCode(code, client, selectedTokenType);
      }

      await navigator.clipboard.writeText(accessTokenData.access_token);
      toast.success('Generated and copied to clipboard', { id: toastId });
    } catch (error) {
      if (shouldErrorBeIgnored(error)) {
        toast.dismiss(toastId);
        return;
      }

      console.error(error);
      toast.error('Failed to generate an access token', { id: toastId });
    } finally {
      generateButtonDisabled = false;
    }
  }
</script>

<CenteredPageContent>
  <h2 class="text-lg font-medium">Access Token</h2>

  <Select items={tokenTypeOptions} type="single" bind:value={selectedTokenType}>
    {#snippet trigger(label)}
      <KeyRound class="text-muted-foreground size-5 mr-2"/>
      <span class="text-muted-foreground">{label || 'Select token type'}</span>
      <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
    {/snippet}
  </Select>

  <Select items={clientOptions} type="single" bind:value={selectedClient}>
    {#snippet trigger(label)}
      <KeyRound class="text-muted-foreground size-5 mr-2"/>
      <span class="text-muted-foreground">{label || 'Select client'}</span>
      <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
    {/snippet}
  </Select>

  <Button
    disabled={generateButtonDisabled || !selectedTokenType || !selectedClient}
    onclick={generateAccessToken}
    variant="epic"
  >
    Generate Access Token
  </Button>
</CenteredPageContent>