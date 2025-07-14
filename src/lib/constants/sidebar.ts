import type { sidebarItems } from '$lib/validations/settings';
import { platform as getPlatform } from '@tauri-apps/plugin-os';
import { derived } from 'svelte/store';
import { t } from '$lib/utils/util';

const platform = getPlatform();

type Category = {
  key: string;
  name: string;
  items: {
    key: typeof sidebarItems[number];
    name: string;
    href: string;
  }[];
};

export const SidebarCategories = derived(t, ($t) => [
  {
    key: 'account',
    name: $t('sidebar.categories.account'),
    items: [
      {
        key: 'vbucksInformation' as const,
        name: $t('vbucksInformation.page.title'),
        href: '/account-management/vbucks'
      },
      {
        key: 'friendManagement' as const,
        name: $t('friendManagement.page.title'),
        href: '/account-management/friends'
      },
      {
        key: 'redeemCodes' as const,
        name: $t('redeemCodes.page.title'),
        href: '/account-management/redeem-codes'
      },
      {
        key: 'epicGamesSettings' as const,
        name: $t('epicGamesSettings.page.title'),
        href: '/account-management/epic-games-settings'
      },
      {
        key: 'eula' as const,
        name: $t('eula.page.title'),
        href: '/account-management/eula'
      }
    ]
  },
  {
    key: 'brStw',
    name: $t('sidebar.categories.brStw'),
    items: [
      {
        key: 'autoKick' as const,
        name: $t('autoKick.page.title'),
        href: '/br-stw/auto-kick'
      },
      {
        key: 'taxiService' as const,
        name: $t('taxiService.page.title'),
        href: '/br-stw/taxi-service'
      },
      {
        key: 'customStatus' as const,
        name: $t('customStatus.page.title'),
        href: '/br-stw/custom-status'
      },
      {
        key: 'partyManagement' as const,
        name: $t('partyManagement.page.title'),
        href: '/br-stw/party'
      },
      {
        key: 'serverStatus' as const,
        name: $t('serverStatus.page.title'),
        href: '/br-stw/server-status'
      },
      {
        key: 'itemShop' as const,
        name: $t('itemShop.page.title'),
        href: '/br-stw/item-shop'
      },
      {
        key: 'earnedXp' as const,
        name: $t('earnedXP.page.title'),
        href: '/br-stw/earned-xp'
      },
      {
        key: 'dailyQuests' as const,
        name: $t('dailyQuests.page.title'),
        href: '/br-stw/daily-quests'
      },
      {
        key: 'stwMissionAlerts' as const,
        name: $t('stwMissionAlerts.page.title'),
        href: '/br-stw/stw-mission-alerts'
      },
      {
        key: 'lookupPlayers' as const,
        name: $t('lookupPlayers.page.title'),
        href: '/br-stw/lookup-players'
      }
    ]
  },
  platform === 'windows' && {
    key: 'downloader',
    name: $t('sidebar.categories.downloader'),
    items: [
      {
        key: 'library' as const,
        name: $t('library.page.title'),
        href: '/downloader/library'
      },
      {
        key: 'downloads' as const,
        name: $t('downloads.page.title'),
        href: '/downloader/downloads'
      }
    ]
  },
  {
    key: 'authentication',
    name: $t('sidebar.categories.authentication'),
    items: [
      {
        key: 'exchangeCode' as const,
        name: $t('exchangeCodeManagement.page.title'),
        href: '/authentication/generate-exchange-code'
      },
      {
        key: 'accessToken' as const,
        name: $t('accessTokenManagement.page.title'),
        href: '/authentication/generate-access-token'
      },
      {
        key: 'deviceAuth' as const,
        name: $t('deviceAuthManagement.page.title'),
        href: '/authentication/device-auth'
      }
    ]
  }
].filter(x => !!x) satisfies Category[]);