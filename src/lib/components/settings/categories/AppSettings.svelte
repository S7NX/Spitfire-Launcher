<script lang="ts">
  import SettingItem from '$components/settings/SettingItem.svelte';
  import ChangeNotifier from '$components/settings/ChangeNotifier.svelte';
  import SystemTray from '$lib/core/system/systemTray';
  import { sidebarCategories } from '$components/Sidebar.svelte';
  import { allSettingsSchema, appSettingsSchema } from '$lib/validations/settings';
  import { platform } from '@tauri-apps/plugin-os';
  import { onMount } from 'svelte';
  import Manifest from '$lib/core/manifest';
  import Input from '$components/ui/Input.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import DataStorage, { SETTINGS_FILE_PATH, SETTINGS_INITIAL_DATA } from '$lib/core/dataStorage';
  import type { AllSettings } from '$types/settings';
  import Select from '$components/ui/Select.svelte';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import { toast } from 'svelte-sonner';

  const currentPlatform = platform();

  let initialSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);
  let initialUserAgent = $state<string>();
  let hasChanges = $state(false);

  let customUserAgent = $state<string>();
  let allSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);

  type SelectOption<T extends string> = {
    label: string;
    value: T;
  };

  const startingPageOptions = appSettingsSchema.shape.startingPage._def.innerType._def.values.map((value) => ({
    label: sidebarCategories.map((category) => category.items).flat().find((item) => item.key === value)!.name,
    value
  }));

  const startingAccountOptions: SelectOption<NonNullable<NonNullable<AllSettings['app']>['startingAccount']>>[] = [
    { label: 'First in the list', value: 'firstInTheList' },
    { label: 'Last used', value: 'lastUsed' }
  ];

  onMount(async function () {
    const userAgent = await Manifest.getUserAgent();
    initialUserAgent = userAgent;
    customUserAgent = userAgent;

    const settingsData = await DataStorage.getSettingsFile(true);
    allSettings = settingsData || SETTINGS_INITIAL_DATA;
    initialSettings = JSON.parse(JSON.stringify(allSettings));
  });

  $effect(() => {
    if (!initialSettings) return;

    const settingsChanged = JSON.stringify(allSettings) !== JSON.stringify(initialSettings);
    const userAgentChanged = customUserAgent !== initialUserAgent;
    const currentSettingsValid = allSettingsSchema.safeParse(allSettings).success;

    hasChanges = !currentSettingsValid ? false : settingsChanged || userAgentChanged;
  });

  async function handleSave() {
    await DataStorage.writeConfigFile<AllSettings>(SETTINGS_FILE_PATH, allSettings);

    if (initialSettings.app?.hideToTray !== allSettings.app?.hideToTray && allSettings.app?.hideToTray != null) {
      await SystemTray.setVisibility(allSettings.app.hideToTray);
    }

    initialSettings = JSON.parse(JSON.stringify(allSettings));
    hasChanges = false;
  }

  function handleReset() {
    allSettings = JSON.parse(JSON.stringify(initialSettings));
    customUserAgent = initialUserAgent;
    hasChanges = false;
  }

  function handleSettingChange<K extends keyof NonNullable<AllSettings['app']>, V extends string | number | boolean = string | number | boolean>(
    eventOrValue: Event | V,
    key: K
  ) {
    const value = typeof eventOrValue === 'object'
      ? (eventOrValue.target as HTMLInputElement).value
      : eventOrValue;

    if (key === 'userAgent') {
      customUserAgent = value as string;
    }

    const newSettings: AllSettings = {
      ...allSettings,
      app: {
        ...allSettings.app,
        [key]: value
      }
    };

    if (!allSettingsSchema.safeParse(newSettings).success) {
      toast.error('You have entered an invalid value.');
    } else {
      allSettings = newSettings;
    }
  }

  function convertToNumber(event: Event) {
    return Number.parseFloat((event.target as HTMLInputElement).value);
  }
</script>

<div class="space-y-6">
  {#if currentPlatform === 'windows'}
    <SettingItem
      labelFor="gamePath"
      orientation="vertical"
      title="Custom Game Path"
    >
      <Input
        id="gamePath"
        onConfirm={(e) => handleSettingChange(e, 'gamePath')}
        value={allSettings?.app?.gamePath}
      />
    </SettingItem>

    <SettingItem
      description="Only applies when Fortnite isn't installed."
      labelFor="userAgent"
      orientation="vertical"
      title="Custom User-Agent"
    >
      <Input
        id="userAgent"
        onConfirm={(e) => handleSettingChange(e, 'userAgent')}
        type="text"
        value={customUserAgent}
      />
    </SettingItem>
  {/if}

  <SettingItem
    description="Checks every {allSettings?.app?.missionCheckInterval} seconds if you are in a STW mission. Used with the auto-kick feature."
    labelFor="missionCheckInterval"
    orientation="vertical"
    title="Mission Check Interval"
  >
    <Input
      id="missionCheckInterval"
      max={10}
      min={1}
      onConfirm={(e) => handleSettingChange(convertToNumber(e), 'missionCheckInterval')}
      type="number"
      value={allSettings?.app?.missionCheckInterval}
    />
  </SettingItem>

  <SettingItem
    description="Waits {allSettings?.app?.claimRewardsDelay} seconds before claiming STW mission rewards."
    labelFor="claimRewardsDelay"
    orientation="vertical"
    title="Delay for Claiming Rewards"
  >
    <Input
      id="claimRewardsDelay"
      max={10}
      min={1}
      onConfirm={(e) => handleSettingChange(convertToNumber(e), 'claimRewardsDelay')}
      type="number"
      value={allSettings?.app?.claimRewardsDelay}
    />
  </SettingItem>

  <SettingItem
    description="Select which page to show when launching the app."
    labelFor="startingPage"
    orientation="vertical"
    title="Starting Page"
  >
    <Select
      id="startingPage"
      items={startingPageOptions}
      triggerClass="w-full"
      type="single"
      bind:value={() => allSettings?.app?.startingPage, (value) => value && handleSettingChange(value, 'startingPage')}
    >
      {#snippet trigger(label)}
        <p>{label}</p>
        <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
      {/snippet}
    </Select>
  </SettingItem>

  <SettingItem
    description="Select which account to use when launching the app."
    labelFor="startingAccount"
    orientation="vertical"
    title="Starting Account"
  >
    <Select
      id="startingAccount"
      items={startingAccountOptions}
      triggerClass="w-full"
      type="single"
      bind:value={() => allSettings?.app?.startingAccount, (value) => value && handleSettingChange(value, 'startingAccount')}
    >
      {#snippet trigger(label)}
        <p>{label}</p>
        <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
      {/snippet}
    </Select>
  </SettingItem>

  {#if currentPlatform === 'windows' || currentPlatform === 'macos' || currentPlatform === 'linux'}
    <SettingItem
      labelFor="hideToTray"
      orientation="horizontal"
      title="Hide to system tray"
    >
      <Switch
        id="hideToTray"
        checked={allSettings?.app?.hideToTray}
        onCheckedChange={(checked) => handleSettingChange(checked, 'hideToTray')}
      />
    </SettingItem>
  {/if}

  <SettingItem
    labelFor="checkForUpdates"
    orientation="horizontal"
    title="Check for updates"
  >
    <Switch
      id="checkForUpdates"
      checked={allSettings?.app?.checkForUpdates}
      onCheckedChange={(checked) => handleSettingChange(checked, 'checkForUpdates')}
    />
  </SettingItem>
</div>

<ChangeNotifier
  onReset={handleReset}
  onSave={handleSave}
  visible={hasChanges}
/>