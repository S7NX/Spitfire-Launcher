<script lang="ts">
  import { fade } from 'svelte/transition';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import Dialog from '$components/ui/Dialog.svelte';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import LoginSteps from '$components/login/LoginSteps.svelte';
  import Account from '$lib/core/account';
  import Authentication from '$lib/core/authentication';
  import DeviceAuthManager from '$lib/core/managers/deviceAuth';
  import { defaultClient, fortniteNewSwitchGameClient } from '$lib/constants/clients';
  import GlobeIcon from 'lucide-svelte/icons/globe';
  import KeyIcon from 'lucide-svelte/icons/key';
  import ArrowLeftIcon from 'lucide-svelte/icons/arrow-left';
  import CheckCircleIcon from 'lucide-svelte/icons/check-circle';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import { accountsStore } from '$lib/stores';
  import { oauthService } from '$lib/core/services';
  import { t } from '$lib/utils/util';
  import type { DeviceCodeLoginData, EpicOAuthData } from '$types/game/authorizations';

  type LoginMethod = 'webConfirmation' | 'exchangeCode';

  type Props = {
    open: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  const { activeAccount, allAccounts } = $derived($accountsStore);

  let currentStep = $state(0);
  let selectedMethod = $state<LoginMethod | null>(null);
  let exchangeCode = $state<string>();
  let isLoggingIn = $state(false);
  let deviceCodeVerifyButtonDisabled = $state(true);

  let deviceCodeData = $state<{ code: string; verificationUrl: string }>();

  const steps = $derived([$t('accountManager.loginSteps.select'), $t('accountManager.loginSteps.login'), $t('accountManager.loginSteps.completed')]);

  const loginMethods: {
    id: LoginMethod;
    name: string;
    description: string;
    icon: any;
    recommended?: boolean;
  }[] = $derived([
    {
      id: 'webConfirmation',
      name: $t('accountManager.loginMethods.webConfirmation.title'),
      description: $t('accountManager.loginMethods.webConfirmation.description'),
      icon: GlobeIcon,
      recommended: true
    },
    {
      id: 'exchangeCode',
      name: $t('accountManager.loginMethods.exchangeCode.title'),
      description: $t('accountManager.loginMethods.exchangeCode.description'),
      icon: KeyIcon
    }
  ]);

  $effect(() => {
    const isLastStep = currentStep === steps.length - 1;
    if (isLastStep) {
      setTimeout(() => {
        closeModal();
      }, 3000);
    }

    if (selectedMethod === 'webConfirmation' && currentStep === 1) {
      generateDeviceCodeLink();

      setTimeout(() => {
        deviceCodeVerifyButtonDisabled = false;
      }, 5000);
    }
  });

  function selectLoginMethod(method: LoginMethod) {
    selectedMethod = method;
    goToNextStep();
  }

  function goToNextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
    }
  }

  function goToPreviousStep() {
    if (currentStep > 0) {
      currentStep--;
    }

    if (currentStep === 0) {
      selectedMethod = null;
    }
  }

  async function handleExchangeCodeSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!exchangeCode?.trim()) return;

    isLoggingIn = true;

    try {
      const accessTokenData = await Authentication.getAccessTokenUsingExchangeCode(exchangeCode);
      await handleLogin(accessTokenData);
    } catch (error) {
      console.error(error);
      toast.error($t('accountManager.failedToLogin'));
    } finally {
      isLoggingIn = false;
    }
  }

  async function generateDeviceCodeLink() {
    const clientToken = await Authentication.getAccessTokenUsingClientCredentials(fortniteNewSwitchGameClient);
    const deviceCodeResponse = await oauthService.post<DeviceCodeLoginData>('deviceAuthorization', {
      body: new URLSearchParams({ prompt: 'login' }).toString(),
      headers: {
        Authorization: `Bearer ${clientToken.access_token}`
      }
    }).json();

    deviceCodeData = {
      code: deviceCodeResponse.device_code,
      verificationUrl: deviceCodeResponse.verification_uri_complete
    };
  }

  async function handleWebConfirmation() {
    isLoggingIn = true;

    try {
      const newSwitchAccessTokenData = await Authentication.getAccessTokenUsingDeviceCode(
        deviceCodeData!.code,
        fortniteNewSwitchGameClient
      );

      const newSwitchExchangeCode = await Authentication.getExchangeCodeUsingAccessToken(
        newSwitchAccessTokenData.access_token
      );

      const androidAccessTokenData = await Authentication.getAccessTokenUsingExchangeCode(newSwitchExchangeCode.code);

      await handleLogin(androidAccessTokenData);
    } catch (error) {
      console.error(error);
      toast.error($t('accountManager.confirmRequest'));
    } finally {
      isLoggingIn = false;
    }
  }

  async function handleLogin(accessTokenData: EpicOAuthData) {
    if (accessTokenData.client_id !== defaultClient.clientId) {
      toast.error('Invalid client ID');
      return;
    }

    if (allAccounts.some((account) => account.accountId === accessTokenData.account_id)) {
      toast.error($t('accountManager.alreadyLoggedIn', { name: accessTokenData.displayName }));
      return;
    }

    const deviceAuthData = await DeviceAuthManager.create({
      accountId: accessTokenData.account_id,
      accessToken: accessTokenData.access_token
    });

    await Account.addAccount({
      displayName: accessTokenData.displayName,
      accountId: accessTokenData.account_id,
      deviceId: deviceAuthData.deviceId,
      secret: deviceAuthData.secret
    });

    goToNextStep();
  }

  function closeModal() {
    open = false;
    currentStep = 0;
    selectedMethod = null;
    exchangeCode = undefined;
    isLoggingIn = false;
    deviceCodeData = undefined;
  }

  function openDeviceCodeLink() {
    openUrl(deviceCodeData!.verificationUrl);
  }
</script>

<Dialog contentProps={{ class: 'overflow-hidden' }} bind:open>
  <div class="flex flex-col">
    <LoginSteps {currentStep} {steps}/>

    <div class="mt-4 min-h-64">
      {#if currentStep === 0}
        <div in:fade={{ duration: 200 }}>
          <h3 class="mb-4 text-lg font-medium">
            {$t('accountManager.chooseLoginMethod')}
          </h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {#each loginMethods as method (method.id)}
              {@const Icon = method.icon}

              <Button
                class="flex flex-col items-center rounded-lg border border-border bg-background p-4"
                onclick={() => selectLoginMethod(method.id)}
                variant="outline"
              >
                <div class="mb-3 rounded-full bg-muted p-3">
                  <Icon class="size-8 text-muted-foreground"/>
                </div>
                <h4 class="mb-1 font-medium">{method.name}</h4>
                <p class="text-center text-sm text-muted-foreground">
                  {method.description}
                </p>

                {#if 'recommended' in method && method.recommended}
                  <span class="mt-2 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {$t('accountManager.recommended')}
                  </span>
                {/if}
              </Button>
            {/each}
          </div>
        </div>
      {:else if currentStep === 1}
        <div class="flex flex-col" in:fade={{ duration: 200 }}>
          <button
            class="mb-4 flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onclick={goToPreviousStep}
          >
            <ArrowLeftIcon class="size-4"/>
            {$t('accountManager.back')}
          </button>

          {#if selectedMethod === 'webConfirmation'}
            <h3 class="text-lg font-medium">
              {$t('accountManager.loginMethods.webConfirmation.title')}
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              {$t('accountManager.loginMethods.webConfirmation.instructions')}
            </p>

            <div class="mb-6 rounded-lg">
              <Button
                class="flex justify-center items-center gap-x-2 w-full"
                disabled={!deviceCodeData?.verificationUrl}
                loading={!deviceCodeData?.verificationUrl}
                loadingText={$t('accountManager.loginMethods.webConfirmation.generatingURL')}
                onclick={openDeviceCodeLink}
                variant="outline"
              >
                <ExternalLinkIcon class="size-4"/>
                {$t('accountManager.loginMethods.webConfirmation.openWebsite')}
              </Button>
            </div>

            {#if !deviceCodeVerifyButtonDisabled}
              <Button
                class="w-full"
                disabled={isLoggingIn ||
                  deviceCodeVerifyButtonDisabled ||
                  !deviceCodeData?.verificationUrl}
                loading={isLoggingIn}
                loadingText={$t('accountManager.verifying')}
                onclick={handleWebConfirmation}
                variant="epic"
              >
                {$t('accountManager.continue')}
              </Button>
            {/if}
          {:else if selectedMethod === 'exchangeCode'}
            <h3 class="text-lg font-medium">
              {$t('accountManager.loginMethods.exchangeCode.title')}
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              {$t('accountManager.loginMethods.exchangeCode.instructions')}
            </p>

            <form class="flex flex-col gap-y-4 flex-1 justify-between h-full" onsubmit={handleExchangeCodeSubmit}>
              <Input
                autofocus={true}
                disabled={isLoggingIn}
                placeholder={$t('accountManager.loginMethods.exchangeCode.inputPlaceholder')}
                type="text"
                bind:value={exchangeCode}
              />

              <div class="flex-1"></div>

              <Button
                class="w-full flex items-center justify-center gap-2 mt-auto"
                disabled={!exchangeCode?.trim() ||
                  exchangeCode?.trim().length < 32 ||
                  isLoggingIn}
                loading={isLoggingIn}
                loadingText={$t('accountManager.verifying')}
                type="submit"
                variant="epic"
              >
                {$t('accountManager.continue')}
              </Button>
            </form>
          {/if}
        </div>
      {:else if currentStep === 2}
        <div
          class="flex flex-col items-center justify-center text-center mt-12"
          in:fade={{ duration: 200 }}
        >
          <div class="mb-4 rounded-full bg-muted p-4">
            <CheckCircleIcon class="size-10 text-muted-foreground"/>
          </div>

          <h3 class="mb-2 text-xl font-medium">
            {$t('accountManager.welcome.title', { name: activeAccount!.displayName })}
          </h3>
          <p class="mb-6 text-muted-foreground">
            {$t('accountManager.welcome.description', { name: activeAccount!.displayName })}
          </p>
        </div>
      {/if}
    </div>
  </div>
</Dialog>
