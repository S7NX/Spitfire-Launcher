import { dev } from '$app/environment';
import config from '$lib/config';
import { accountDataFileSchema } from '$lib/validations/accounts';
import { allSettingsSchema, automationSettingsSchema, customizableMenuSettingsSchema, deviceAuthsSettingsSchema } from '$lib/validations/settings';
import type { AccountDataFile } from '$types/accounts';
import type { AllSettings, AutomationSettings, CustomizableMenuSettings, DeviceAuthsSettings, TaxiSettings } from '$types/settings';
import { path } from '@tauri-apps/api';
import { dataDir } from '@tauri-apps/api/path';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
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
    startingPage: 'stwWorldInfo',
    startingAccount: 'firstInTheList',
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

export const TAXI_FILE_PATH = dev ? 'taxi-dev.json' : 'taxi.json';
export const TAXI_INITIAL_DATA: TaxiSettings = [];

export default class DataStorage {
  private static caches: {
    dataDirectory?: string;
    accountsFile?: AccountDataFile;
    settingsFile?: AllSettings;
    deviceAuthsFile?: DeviceAuthsSettings;
    automationFile?: AutomationSettings;
    taxiFile?: TaxiSettings;
  } = {};

  static async getAccountsFile(bypassCache = false) {
    if (DataStorage.caches.accountsFile && !bypassCache) return DataStorage.caches.accountsFile;

    return DataStorage.getFile<AccountDataFile>(
      ACCOUNTS_FILE_PATH,
      ACCOUNTS_INITIAL_DATA,
      accountDataFileSchema,
      (data) => { DataStorage.caches.accountsFile = data; }
    );
  }

  static async getSettingsFile(bypassCache = false) {
    if (DataStorage.caches.settingsFile && !bypassCache) return DataStorage.caches.settingsFile;

    return DataStorage.getFile<AllSettings>(
      SETTINGS_FILE_PATH,
      SETTINGS_INITIAL_DATA,
      allSettingsSchema,
      (data) => { DataStorage.caches.settingsFile = data; }
    );
  }

  static async getDeviceAuthsFile(bypassCache = false) {
    if (DataStorage.caches.deviceAuthsFile && !bypassCache) return DataStorage.caches.deviceAuthsFile;

    return DataStorage.getFile<DeviceAuthsSettings>(
      DEVICE_AUTHS_FILE_PATH,
      DEVICE_AUTHS_INITIAL_DATA,
      deviceAuthsSettingsSchema,
      (data) => { DataStorage.caches.deviceAuthsFile = data; }
    );
  }

  static async getAutomationFile(bypassCache = false) {
    if (DataStorage.caches.automationFile && !bypassCache) return DataStorage.caches.automationFile;

    return DataStorage.getFile<AutomationSettings>(
      AUTOMATION_FILE_PATH,
      AUTOMATION_INITIAL_DATA,
      automationSettingsSchema,
      (data) => { DataStorage.caches.automationFile = data; }
    );
  }

  static async getTaxiFile(bypassCache = false) {
    if (DataStorage.caches.taxiFile && !bypassCache) return DataStorage.caches.taxiFile;

    return DataStorage.getFile<TaxiSettings>(
      TAXI_FILE_PATH,
      TAXI_INITIAL_DATA,
      deviceAuthsSettingsSchema,
      (data) => { DataStorage.caches.taxiFile = data; }
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
      DataStorage.caches.accountsFile = newData as AccountDataFile;
    } else if (pathString === SETTINGS_FILE_PATH) {
      DataStorage.caches.settingsFile = newData as AllSettings;
    } else if (pathString === AUTOMATION_FILE_PATH) {
      DataStorage.caches.automationFile = newData as AutomationSettings;
    } else if (pathString === TAXI_FILE_PATH) {
      DataStorage.caches.taxiFile = newData as TaxiSettings;
    }

    await writeTextFile(configFilePath, JSON.stringify(newData, null, 4));
  }

  private static async getDataDirectory() {
    if (DataStorage.caches.dataDirectory) return DataStorage.caches.dataDirectory;

    const dataDirectory = await path.join(await dataDir(), config.identifier);

    if (!(await exists(dataDirectory))) {
      await mkdir(dataDirectory, { recursive: true });
    }

    DataStorage.caches.dataDirectory = dataDirectory;
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
      : (data || initialValue) as T;
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