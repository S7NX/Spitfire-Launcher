<script lang="ts">
  import SettingItem from '$components/settings/SettingItem.svelte';
  import SettingTextInputItem from '$components/settings/SettingTextInputItem.svelte';
  import ChangeNotifier from '$components/settings/ChangeNotifier.svelte';
  import { onMount } from 'svelte';
  import { accountsStore } from '$lib/stores';
  import Manifest from '$lib/core/manifest';
  import Input from '$components/ui/Input.svelte';
  import Switch from '$components/ui/Switch.svelte';
  import DataStorage, { SETTINGS_FILE_PATH, SETTINGS_INITIAL_DATA } from '$lib/core/dataStorage';
  import type { AllSettings } from '$types/settings';

  const activeAccount = $derived($accountsStore.activeAccount);

  let initialSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);
  let initialUserAgent = $state<string>();
  let hasChanges = $state(false);

  let customUserAgent = $state<string>();
  let allSettings = $state<AllSettings>(SETTINGS_INITIAL_DATA);

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

    hasChanges = settingsChanged || userAgentChanged;
  });

  async function handleSave() {
    await DataStorage.writeConfigFile<AllSettings>(SETTINGS_FILE_PATH, allSettings);

    initialSettings = JSON.parse(JSON.stringify(allSettings));
    hasChanges = false;
  }

  function handleReset() {
    allSettings = JSON.parse(JSON.stringify(initialSettings));
    customUserAgent = initialUserAgent;
    hasChanges = false;
  }

  function handleSettingChange<C extends keyof AllSettings>(
    eventOrValue: Event | string | boolean,
    section: C,
    key: string
  ) {
    const value = typeof eventOrValue === 'object'
      ? (eventOrValue.target as HTMLInputElement).value
      : eventOrValue;

    allSettings = {
      ...allSettings,
      [section]: {
        ...allSettings[section],
        [key]: value
      }
    };
  }

  function handleUserAgentChange(event: Event) {
    const target = event.target as HTMLInputElement;
    customUserAgent = target.value;

    handleSettingChange(target.value, 'app', 'userAgent');
  }
</script>

<div class="space-y-6">
  <SettingTextInputItem title="Custom Game Path">
    <Input
      oninput={(e) => handleSettingChange(e, 'app', 'gamePath')}
      value={allSettings?.app?.gamePath}
    />
  </SettingTextInputItem>

  <SettingTextInputItem
    description="Only applies when Fortnite isn't installed."
    title="Custom User-Agent"
  >
    <Input
      disabled={!!activeAccount}
      oninput={handleUserAgentChange}
      type="text"
      value={customUserAgent}
      variant={!!activeAccount ? 'disabled' : 'primary'}
    />
  </SettingTextInputItem>

  <SettingTextInputItem
    description="Checks every {allSettings?.app?.missionCheckInterval} seconds if you are in a STW mission. Used with the auto-kick feature."
    title="Mission Check Interval"
  >
    <Input
      max={10}
      min={1}
      oninput={(e) => handleSettingChange(e, 'app', 'missionCheckInterval')}
      type="number"
      value={allSettings?.app?.missionCheckInterval}
    />
  </SettingTextInputItem>

  <SettingItem title="Hide to system tray">
    <Switch
      checked={allSettings?.app?.hideToTray}
      onCheckedChange={(checked) => handleSettingChange(checked, 'app', 'hideToTray')}
    />
  </SettingItem>

  <SettingItem title="Check for updates">
    <Switch
      checked={allSettings?.app?.checkForUpdates}
      onCheckedChange={(checked) => handleSettingChange(checked, 'app', 'checkForUpdates')}
    />
  </SettingItem>
</div>

<ChangeNotifier
  onReset={handleReset}
  onSave={handleSave}
  visible={hasChanges}
/>