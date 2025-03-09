import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import * as path from '@tauri-apps/api/path';
import DataStorage from '$lib/core/dataStorage';

type ManifestData = {
  appVersionString: string;
  launchCommand: string;
  userAgent: string;
  installLocation: string;
  launchExecutable: string;
  executableLocation: string;
}

let gameFileCache: ManifestData | null = null;

export default class Manifest {
  static async getUserAgent() {
    const settings = await DataStorage.getSettingsFile();
    const customUserAgent = settings.app?.userAgent;

    const gameData = await Manifest.getData();
    return gameData?.userAgent || customUserAgent || 'Fortnite/++Fortnite+Release-34.00-CL-40228973-Windows';
  }

  static async getData() {
    if (gameFileCache) return gameFileCache;

    try {
      const manifestsDirectory = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
      const manifestFiles = await readDir(manifestsDirectory);

      let fortniteFile: ManifestData | null = null;

      for (const dirEntry of manifestFiles) {
        if (dirEntry.name.endsWith('.item')) {
          const fileContent = await readTextFile(await path.join(manifestsDirectory, dirEntry.name));
          const file = JSON.parse(fileContent) as {
            AppVersionString: string;
            LaunchCommand: string;
            DisplayName: string;
            InstallLocation: string;
            LaunchExecutable: string;
          };

          const appVersionString = file.AppVersionString?.trim();

          if (file.DisplayName.toLowerCase() === 'fortnite') {
            fortniteFile = {
              appVersionString: appVersionString ?? '',
              launchCommand: file.LaunchCommand?.trim() ?? '',
              userAgent: appVersionString ? `Fortnite/${appVersionString}` : '',
              installLocation: file.InstallLocation,
              launchExecutable: file.LaunchExecutable,
              executableLocation: file.InstallLocation + '\\' + file.LaunchExecutable
            };

            break;
          }
        }
      }

      gameFileCache = fortniteFile;
      return fortniteFile;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}
