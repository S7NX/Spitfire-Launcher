import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { dataDir } from '@tauri-apps/api/path';
import { path } from '@tauri-apps/api';
import { dev } from '$app/environment';
import config from '$lib/config';
import { accountDataFileSchema } from '$lib/validations/accounts';
import type { AccountDataFile } from '$types/accounts';
import { allSettingsSchema, automationSettingsSchema, customizableMenuSettingsSchema } from '$lib/validations/settings';
import type { AllSettings, AutomationSettings, CustomizableMenuSettings, DeviceAuthsSettings } from '$types/settings';
import type { ZodSchema } from 'zod';

export const ACCOUNTS_FILE_PATH = dev ? 'accounts-dev.json' : 'accounts.json';
export const ACCOUNTS_INITIAL_DATA: AccountDataFile = {
  accounts: []
};

export const SETTINGS_FILE_PATH = dev ? 'settings-dev.json' : 'settings.json';
export const SETTINGS_INITIAL_DATA: AllSettings = {
  app: {
    claimRewardsDelay: 1.5,
    missionCheckInterval: 5,
    startingPage: 'STW_WORLD_INFO',
    startingAccount: 'FIRST_IN_LIST',
    hideToTray: false,
    checkForUpdates: true
  },
  customizableMenu: Object.keys(customizableMenuSettingsSchema.shape).reduce<CustomizableMenuSettings>((acc, key) => {
    acc[key as keyof NonNullable<CustomizableMenuSettings>] = true;
    return acc;
  }, {})
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

    return DataStorage.getFile<AccountDataFile>(
      ACCOUNTS_FILE_PATH,
      ACCOUNTS_INITIAL_DATA,
      accountDataFileSchema,
      (data) => { accountsFileCache = data; }
    );
  }

  static async getSettingsFile(bypassCache = false) {
    if (settingsFileCache && !bypassCache) return settingsFileCache;

    return DataStorage.getFile<AllSettings>(
      SETTINGS_FILE_PATH,
      SETTINGS_INITIAL_DATA,
      allSettingsSchema,
      (data) => { settingsFileCache = data; }
    );
  }

  static async getDeviceAuthsFile() {
    return DataStorage.getConfigFile<DeviceAuthsSettings>(DEVICE_AUTHS_FILE_PATH, DEVICE_AUTHS_INITIAL_DATA);
  }

  static async getAutomationFile(bypassCache = false) {
    if (automationFileCache && !bypassCache) return automationFileCache;

    return DataStorage.getFile<AutomationSettings>(
      AUTOMATION_FILE_PATH,
      AUTOMATION_INITIAL_DATA,
      automationSettingsSchema,
      (data) => { automationFileCache = data; }
    );
  }

  private static async getFile<T>(
    filePath: string,
    initialData: T,
    schema?: ZodSchema,
    setCacheCallback?: (data: T) => void
  ): Promise<T> {
    const file = await DataStorage.getConfigFile<T>(filePath, initialData);

    if (schema) {
      const parseResult = schema.safeParse(file);
      if (parseResult.success && setCacheCallback) {
        setCacheCallback(parseResult.data);
      }

      return parseResult.success ? parseResult.data : initialData;
    }

    return file;
  }

  static async writeConfigFile<T = any>(pathString: string, data: Partial<T>) {
    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    const currentData = await DataStorage.getConfigFile(pathString);

    const newData: unknown = !Array.isArray(data) && currentData && typeof currentData === 'object' && !Array.isArray(currentData) ? Object.assign(currentData, data) : data;

    if (pathString === ACCOUNTS_FILE_PATH) {
      accountsFileCache = newData as AccountDataFile;
    } else if (pathString === SETTINGS_FILE_PATH) {
      settingsFileCache = newData as AllSettings;
    } else if (pathString === AUTOMATION_FILE_PATH) {
      automationFileCache = newData as AutomationSettings;
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

  private static async getConfigFile<T>(pathString: string, initialValue?: T): Promise<T> {
    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    let configFileContent: string | null = null;

    try {
      configFileContent = await readTextFile(configFilePath);
    } catch {
      if (initialValue) await writeTextFile(configFilePath, JSON.stringify(initialValue, null, 4));
    }

    let data: T | undefined = initialValue;

    if (configFileContent) {
      try {
        data = JSON.parse(configFileContent);
      } catch {}
    }

    return data && initialValue
      ? DataStorage.mergeWithDefaults(initialValue, data)
      : initialValue as T;
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