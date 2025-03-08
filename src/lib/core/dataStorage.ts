import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { dataDir } from '@tauri-apps/api/path';
import { path } from '@tauri-apps/api';
import { dev } from '$app/environment';
import config from '$lib/config';
import { accountDataFileSchema } from '$lib/validations/accounts';
import type { AccountDataFile } from '$types/accounts';
import { allSettingsSchema } from '$lib/validations/settings';
import type { AllSettings, DeviceAuthsSettings } from '$types/settings';

export const ACCOUNTS_FILE_PATH = dev ? 'accounts-dev.json' : 'accounts.json';
export const ACCOUNTS_INITIAL_DATA: AccountDataFile = {
  accounts: []
};

export const SETTINGS_FILE_PATH = dev ? 'settings-dev.json' : 'settings.json';
export const SETTINGS_INITIAL_DATA: AllSettings = {
  app: {
    hideToTray: false,
    checkForUpdates: true
  },
  deviceAuths: []
};

export const DEVICE_AUTHS_FILE_PATH = dev ? 'device-auths-dev.json' : 'device-auths.json';
export const DEVICE_AUTHS_INITIAL_DATA: DeviceAuthsSettings = [];

let dataDirectoryCache: string;
let accountsFileCache: AccountDataFile;
let settingsFileCache: AllSettings;

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

  static async getDeviceAuthsFile() {
    return await DataStorage.getConfigFile<DeviceAuthsSettings>(DEVICE_AUTHS_FILE_PATH, DEVICE_AUTHS_INITIAL_DATA);
  }

  static async writeConfigFile<T = any>(pathString: string, data: Partial<T>) {
    const cleanData = Object.fromEntries(
      Object.entries(data)
    ) as Partial<T>;

    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    const currentData: any = await DataStorage.getConfigFile(pathString);

    const newData = Object.assign(currentData, cleanData);

    if (pathString === ACCOUNTS_FILE_PATH) {
      accountsFileCache = newData;
    } else if (pathString === SETTINGS_FILE_PATH) {
      settingsFileCache = newData;
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

  private static async getConfigFile<T>(pathString: string, initialValue: unknown = {}): Promise<T> {
    const initialStringValue = typeof initialValue === 'string' ? initialValue : JSON.stringify(initialValue);
    const configFilePath = await path.join(await DataStorage.getDataDirectory(), pathString);
    let configFileContent: string | null = null;

    try {
      configFileContent = await readTextFile(configFilePath);
    } catch {
      await writeTextFile(configFilePath, initialStringValue);
    }

    return JSON.parse(configFileContent || initialStringValue);
  }
}