import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { dataDir } from '@tauri-apps/api/path';
import { path } from '@tauri-apps/api';
import { dev } from '$app/environment';
import config from '$lib/config';
import { accountDataFileSchema } from '$lib/validations/accounts';
import type { AccountDataFile } from '$types/accounts';
import { allSettingsSchema, automationSettingsSchema } from '$lib/validations/settings';
import type { AllSettings, AutomationSettings, DeviceAuthsSettings } from '$types/settings';

export const ACCOUNTS_FILE_PATH = dev ? 'accounts-dev.json' : 'accounts.json';
export const ACCOUNTS_INITIAL_DATA: AccountDataFile = {
  accounts: []
};

export const SETTINGS_FILE_PATH = dev ? 'settings-dev.json' : 'settings.json';
export const SETTINGS_INITIAL_DATA: AllSettings = {
  app: {
    missionCheckInterval: 5,
    startingPage: 'STW_WORLD_INFO',
    startingAccount: 'FIRST_IN_LIST',
    hideToTray: false,
    checkForUpdates: true
  },
  deviceAuths: []
};

export const DEVICE_AUTHS_FILE_PATH = dev ? 'device-auths-dev.json' : 'device-auths.json';
export const DEVICE_AUTHS_INITIAL_DATA: DeviceAuthsSettings = [];

export const AUTOMATION_FILE_PATH = dev ? 'automation-dev.json' : 'automation.json';
export const AUTOMATION_INITIAL_DATA: AutomationSettings = [];

let dataDirectoryCache: string;
let accountsFileCache: AccountDataFile;
let settingsFileCache: AllSettings;
let automationFileCache: AutomationSettings;

export default class DataStorage {
  static async getAccountsFile(bypassCache = false) {
    if (accountsFileCache && !bypassCache) return accountsFileCache;

    const file = await DataStorage.getConfigFile<AccountDataFile>(ACCOUNTS_FILE_PATH, ACCOUNTS_INITIAL_DATA);

    const parseResult = accountDataFileSchema.safeParse(file);
    if (parseResult.success) accountsFileCache = parseResult.data;

    return parseResult.success ? parseResult.data : ACCOUNTS_INITIAL_DATA;
  }

  static async getSettingsFile(bypassCache = false) {
    if (settingsFileCache && !bypassCache) return settingsFileCache;

    const file = await DataStorage.getConfigFile<AllSettings>(SETTINGS_FILE_PATH, SETTINGS_INITIAL_DATA);

    const parseResult = allSettingsSchema.safeParse(file);
    if (parseResult.success) settingsFileCache = parseResult.data;

    return parseResult.success ? parseResult.data : SETTINGS_INITIAL_DATA;
  }

  static getDeviceAuthsFile() {
    return DataStorage.getConfigFile<DeviceAuthsSettings>(DEVICE_AUTHS_FILE_PATH, DEVICE_AUTHS_INITIAL_DATA);
  }

  static async getAutomationFile() {
    if (automationFileCache) return automationFileCache;

    const file = await DataStorage.getConfigFile<AutomationSettings>(AUTOMATION_FILE_PATH, AUTOMATION_INITIAL_DATA);

    const parseResult = automationSettingsSchema.safeParse(file);
    if (parseResult.success) automationFileCache = parseResult.data;

    return parseResult.success ? parseResult.data : AUTOMATION_INITIAL_DATA;
  }

  static async writeConfigFile<T = any>(pathString: string, data: Partial<T>) {
    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    const currentData: any = await DataStorage.getConfigFile(pathString);

    const newData = !Array.isArray(data) ? Object.assign(currentData, data) : data;

    if (pathString === ACCOUNTS_FILE_PATH) {
      accountsFileCache = newData;
    } else if (pathString === SETTINGS_FILE_PATH) {
      settingsFileCache = newData;
    } else if (pathString === AUTOMATION_FILE_PATH) {
      automationFileCache = newData;
    }

    await writeTextFile(configFilePath, JSON.stringify(newData, null, 4));
  }

  private static async getDataDirectory() {
    if (dataDirectoryCache) return dataDirectoryCache;

    const dataDirectory = await path.join(await dataDir(), config.identifier);

    if (!(await exists(dataDirectory))) {
      await mkdir(dataDirectory, { recursive: true });
    }

    dataDirectoryCache = dataDirectory;
    return dataDirectory;
  }

  private static async getConfigFile<T>(pathString: string, initialValue: Record<string, any> = {}): Promise<T> {
    const initialStringValue = JSON.stringify(initialValue);
    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    let configFileContent: string | null = null;

    try {
      configFileContent = await readTextFile(configFilePath);
    } catch {
      await writeTextFile(configFilePath, initialStringValue);
    }

    return DataStorage.mergeWithDefaults(initialValue, JSON.parse(configFileContent || initialStringValue));
  }

  private static mergeWithDefaults<T>(defaults: T, data: T): T {
    if (Array.isArray(data)) return data;

    const merged = Object.assign({}, defaults);

    for (const key in data) {
      if (data[key] instanceof Object && defaults[key] instanceof Object && !Array.isArray(defaults[key])) {
        merged[key] = DataStorage.mergeWithDefaults(defaults[key], data[key]) as any;
      } else {
        merged[key] = data[key] as any;
      }
    }

    return merged;
  }
}