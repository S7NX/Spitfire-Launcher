<script lang="ts">
  import SettingItem from '$components/settings/SettingItem.svelte';
  import ChangeNotifier from '$components/settings/ChangeNotifier.svelte';
  import SystemTray from '$lib/core/system/systemTray';
  import { allSettingsSchema, appSettingsSchema } from '$lib/validations/settings';
  import { platform } from '@tauri-apps/plugin-os';
  import { onMount } from 'svelte';
  import Input from '$components/ui/Input.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import DataStorage, { SETTINGS_FILE_PATH, SETTINGS_INITIAL_DATA } from '$lib/core/dataStorage';
  import type { AllSettings } from '$types/settings';
  import Select from '$components/ui/Select.svelte';
  import ChevronsUpAndDownIcon from 'lucide-svelte/icons/chevrons-up-down';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/utils/util';
  import { SidebarCategories } from '$lib/constants/sidebar';

  const currentPlatform = platform();

  let initialSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);
  let hasChanges = $state(false);

  let allSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);

  type SelectOption<T extends string> = {
    label: string;
    value: T;
  };

  const startingPageOptions = appSettingsSchema.shape.startingPage._def.innerType._def.values.map((value) => ({
    label: $SidebarCategories.map((category) => category.items).flat().find((item) => item.key === value)!.name,
    value
  }));

  const startingAccountOptions: SelectOption<NonNullable<NonNullable<AllSettings['app']>['startingAccount']>>[] = [
    {
      label: $t('settings.appSettings.startingAccount.values.firstInList'),
      value: 'firstInTheList'
    },
    {
      label: $t('settings.appSettings.startingAccount.values.lastUsed'),
      value: 'lastUsed'
    }
  ];

  onMount(async function () {
    const settingsData = await DataStorage.getSettingsFile(true);
    allSettings = settingsData || SETTINGS_INITIAL_DATA;
    initialSettings = JSON.parse(JSON.stringify(allSettings));
  });

  $effect(() => {
    if (!initialSettings) return;

    const settingsChanged = JSON.stringify(allSettings) !== JSON.stringify(initialSettings);
    const currentSettingsValid = allSettingsSchema.safeParse(allSettings).success;

    hasChanges = !currentSettingsValid ? false : settingsChanged;
  });

  async function handleSave() {
    await DataStorage.writeConfigFile<AllSettings>(SETTINGS_FILE_PATH, allSettings
    );

    if (
      initialSettings.app?.hideToTray !== allSettings.app?.hideToTray
      && allSettings.app?.hideToTray != null
    ) {
      await SystemTray.setVisibility(allSettings.app.hideToTray);
    }

    initialSettings = JSON.parse(JSON.stringify(allSettings));
    hasChanges = false;
  }

  function handleReset() {
    allSettings = JSON.parse(JSON.stringify(initialSettings));
    hasChanges = false;
  }

  function handleSettingChange<K extends keyof NonNullable<AllSettings['app']>, V extends string | number | boolean = string | number | boolean>(
    eventOrValue: Event | V,
    key: K
  ) {
    const value = typeof eventOrValue === 'object'
      ? (eventOrValue.target as HTMLInputElement).value
      : eventOrValue;

    const newSettings: AllSettings = {
      ...allSettings,
      app: {
        ...allSettings.app,
        [key]: value
      }
    };

    if (!allSettingsSchema.safeParse(newSettings).success) {
      toast.error($t('settings.appSettings.invalidValue'));
    } else {
      allSettings = newSettings;
      SystemTray.setVisibility(allSettings.app?.hideToTray || false);
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
      title={$t('settings.appSettings.gamePath')}
    >
      <Input
        id="gamePath"
        onConfirm={(e) => handleSettingChange(e, 'gamePath')}
        value={allSettings?.app?.gamePath}
      />
    </SettingItem>
  {/if}

  <SettingItem
    description={$t('settings.appSettings.missionCheckInterval.description')}
    labelFor="missionCheckInterval"
    orientation="vertical"
    title={$t('settings.appSettings.missionCheckInterval.title')}
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
    description={$t('settings.appSettings.claimRewardsDelay.description')}
    labelFor="claimRewardsDelay"
    orientation="vertical"
    title={$t('settings.appSettings.claimRewardsDelay.title')}
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
    description={$t('settings.appSettings.startingPage.description')}
    labelFor="startingPage"
    orientation="vertical"
    title={$t('settings.appSettings.startingPage.title')}
  >
    <Select
      id="startingPage"
      items={startingPageOptions}
      triggerClass="w-full"
      type="single"
      bind:value={
        () => allSettings?.app?.startingPage,
        (value) => value && handleSettingChange(value, 'startingPage')
      }
    >
      {#snippet trigger(label)}
        <p>{label}</p>
        <ChevronsUpAndDownIcon class="text-muted-foreground size-5 ml-auto"/>
      {/snippet}
    </Select>
  </SettingItem>

  <SettingItem
    description={$t('settings.appSettings.startingAccount.description')}
    labelFor="startingAccount"
    orientation="vertical"
    title={$t('settings.appSettings.startingAccount.title')}
  >
    <Select
      id="startingAccount"
      items={startingAccountOptions}
      triggerClass="w-full"
      type="single"
      bind:value={
        () => allSettings?.app?.startingAccount,
        (value) => value && handleSettingChange(value, 'startingAccount')
      }
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
      title={$t('settings.appSettings.hideToTray')}
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
    title={$t('settings.appSettings.checkForUpdates')}
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
