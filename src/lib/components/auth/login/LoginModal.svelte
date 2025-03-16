<script lang="ts">
  import { fade } from 'svelte/transition';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { toast } from 'svelte-sonner';
  import Dialog from '$components/ui/Dialog.svelte';
  import Button from '$components/ui/Button.svelte';
  import Input from '$components/ui/Input.svelte';
  import LoginSteps from '$components/auth/login/LoginSteps.svelte';
  import Account from '$lib/core/account';
  import Authentication from '$lib/core/authentication';
  import DeviceAuthManager from '$lib/core/managers/deviceAuth';
  import { defaultClient, fortniteNewSwitchGameClient } from '$lib/constants/clients';
  import GlobeIcon from 'lucide-svelte/icons/globe';
  import KeyIcon from 'lucide-svelte/icons/key';
  import ArrowLeftIcon from 'lucide-svelte/icons/arrow-left';
  import CheckCircleIcon from 'lucide-svelte/icons/check-circle';
  import ExternalLinkIcon from 'lucide-svelte/icons/external-link';
  import LoaderCircleIcon from 'lucide-svelte/icons/loader-circle';
  import { accountsStore } from '$lib/stores';
  import oauthService from '$lib/core/services/oauth';
  import type { DeviceCodeLoginData, EpicOAuthData } from '$types/game/authorizations';

  type LoginMethod = 'web' | 'exchange-code';

  type Props = {
    open: boolean;
  };

  let { open = $bindable(false) }: Props = $props();

  const activeAccount = $derived($accountsStore.activeAccount);

  let currentStep = $state(0);
  let selectedMethod = $state<LoginMethod | null>(null);
  let exchangeCode = $state<string>();
  let isLoading = $state(false);
  let deviceCodeVerifyButtonDisabled = $state(true);

  let deviceCodeData = $state<{ code: string; verificationUrl: string }>();

  const steps = ['Select Method', 'Login', 'Complete'];

  const loginMethods: {
    id: LoginMethod;
    name: string;
    description: string;
    icon: any;
    recommended?: boolean
  }[] = [
    {
      id: 'web',
      name: 'Web Confirmation',
      description: 'Login through Epic\'s website with a simple confirmation step.',
      icon: GlobeIcon,
      recommended: true
    },
    {
      id: 'exchange-code',
      name: 'Exchange Code',
      description: 'Use a pre-generated exchange code from your Epic Games account.',
      icon: KeyIcon
    }
  ];

  $effect(() => {
    const isLastStep = currentStep === steps.length - 1;
    if (isLastStep) {
      setTimeout(() => {
        closeModal();
      }, 3000);
    }

    if (selectedMethod === 'web' && currentStep === 1) {
      generateDeviceCodeLink();

      setTimeout(() => {
        deviceCodeVerifyButtonDisabled = false;
      }, 5000);
    }
  });

  function selectLoginMethod(method: 'web' | 'exchange-code') {
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

    isLoading = true;

    try {
      const accessTokenData = await Authentication.getAccessTokenUsingExchangeCode(exchangeCode);
      await handleLogin(accessTokenData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to login');
    } finally {
      isLoading = false;
    }
  }

  async function generateDeviceCodeLink() {
    isLoading = true;

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

    isLoading = false;
  }

  async function handleWebConfirmation() {
    isLoading = true;

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
      toast.error('Please confirm the login on the Epic Games website');
    } finally {
      isLoading = false;
    }
  }

  async function handleLogin(accessTokenData: EpicOAuthData) {
    if (accessTokenData.client_id !== defaultClient.clientId) {
      toast.error('Invalid client ID');
      return;
    }

    if (accessTokenData.account_id === activeAccount?.accountId) {
      toast.error(`You are already logged in with ${accessTokenData.displayName}`);
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
    isLoading = false;
    deviceCodeData = undefined;
  }

  function openDeviceCodeLink() {
    openUrl(deviceCodeData!.verificationUrl);
  }
</script>

<Dialog bind:open>
  <div class="flex flex-col">
    <LoginSteps {currentStep} {steps}/>

    <div class="mt-4 min-h-64">
      {#if currentStep === 0}
        <div in:fade={{ duration: 200 }}>
          <h3 class="mb-4 text-lg font-medium">Choose Login Method</h3>
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
                  <span class="mt-2 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    Recommended
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
            Back
          </button>

          {#if selectedMethod === 'exchange-code'}
            <h3 class="mb-4 text-lg font-medium">Enter Exchange Code</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Paste the exchange code generated from your Epic Games account.
            </p>

            <form
              class="space-y-4"
              onsubmit={handleExchangeCodeSubmit}
            >
              <Input
                class="mb-4"
                disabled={isLoading}
                placeholder="Enter exchange code"
                type="text"
                bind:value={exchangeCode}
              />

              <Button
                class="w-full flex items-center justify-center gap-2"
                disabled={!exchangeCode?.trim() || exchangeCode?.trim().length < 32 || isLoading}
                type="submit"
                variant="epic"
              >
                {#if isLoading}
                  <LoaderCircleIcon class="size-5 animate-spin"/>
                  <span>Verifying...</span>
                {:else}
                  Continue
                {/if}
              </Button>
            </form>
          {:else if selectedMethod === 'web'}
            <h3 class="mb-4 text-lg font-medium">Web Confirmation</h3>
            <div class="mb-6 rounded-lg">
              <p class="mb-4 text-sm">
                Click the button below to open Epic Games website. Once you've confirmed access there,
                click "Continue" to proceed.
              </p>

              <Button
                class="flex w-full items-center justify-center gap-2"
                disabled={!deviceCodeData?.verificationUrl}
                onclick={openDeviceCodeLink}
                variant="outline"
              >
                {#if deviceCodeData?.verificationUrl}
                  <ExternalLinkIcon class="size-4"/>
                  Open Epic Games Website
                {:else}
                  Generating URL...
                {/if}
              </Button>
            </div>

            <Button
              class="w-full flex items-center justify-center gap-2"
              disabled={isLoading || deviceCodeVerifyButtonDisabled || !deviceCodeData?.verificationUrl}
              onclick={handleWebConfirmation}
              variant="epic"
            >
              {#if isLoading}
                <LoaderCircleIcon class="size-5 animate-spin"/>
                <span>Verifying...</span>
              {:else}
                Continue
              {/if}
            </Button>
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

          <h3 class="mb-2 text-xl font-medium">👋 Welcome, {activeAccount?.displayName}</h3>
          <p class="mb-6 text-muted-foreground">
            You have been successfully logged into your Epic Games account.
          </p>
        </div>
      {/if}
    </div>
  </div>
</Dialog>
