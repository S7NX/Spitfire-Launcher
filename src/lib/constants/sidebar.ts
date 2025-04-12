import type { AllSettings } from '$types/settings';
import { derived } from 'svelte/store';
import { t } from '$lib/utils/util';

type Category = {
  key: string;
  name: string;
  items: {
    key: keyof NonNullable<AllSettings['customizableMenu']>;
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
        key: 'vbucksInformation',
        name: $t('sidebar.items.vbucksInformation'),
        href: '/account-management/vbucks'
      },
      {
        key: 'redeemCodes',
        name: $t('sidebar.items.redeemCodes'),
        href: '/account-management/redeem-codes'
      },
      {
        key: 'epicGamesSettings',
        name: $t('sidebar.items.epicGamesSettings'),
        href: '/account-management/epic-games-settings'
      },
      {
        key: 'eula',
        name: $t('sidebar.items.eula'),
        href: '/account-management/eula'
      }
    ]
  },
  {
    key: 'brStw',
    name: $t('sidebar.categories.brStw'),
    items: [
      {
        key: 'autoKick',
        name: $t('sidebar.items.autoKick'),
        href: '/br-stw/auto-kick'
      },
      {
        key: 'taxiService',
        name: $t('sidebar.items.taxiService'),
        href: '/br-stw/taxi-service'
      },
      {
        key: 'botLobby',
        name: $t('sidebar.items.botLobby'),
        href: '/br-stw/bot-lobby'
      },
      {
        key: 'customStatus',
        name: $t('sidebar.items.customStatus'),
        href: '/br-stw/custom-status'
      },
      {
        key: 'partyManagement',
        name: $t('sidebar.items.partyManagement'),
        href: '/br-stw/party'
      },
      {
        key: 'serverStatus',
        name: $t('sidebar.items.serverStatus'),
        href: '/br-stw/server-status'
      },
      {
        key: 'itemShop',
        name: $t('sidebar.items.itemShop'),
        href: '/br-stw/item-shop'
      },
      {
        key: 'earnedXp',
        name: $t('sidebar.items.earnedXp'),
        href: '/br-stw/earned-xp'
      },
      {
        key: 'dailyQuests',
        name: $t('sidebar.items.dailyQuests'),
        href: '/br-stw/daily-quests'
      },
      {
        key: 'stwWorldInfo',
        name: $t('sidebar.items.stwWorldInfo'),
        href: '/br-stw/stw-world-info'
      },
      {
        key: 'lookupPlayers',
        name: $t('sidebar.items.lookupPlayers'),
        href: '/br-stw/lookup-players'
      }
    ]
  },
  {
    key: 'authentication',
    name: $t('sidebar.categories.authentication'),
    items: [
      {
        key: 'exchangeCode',
        name: 'Exchange Code',
        href: '/authentication/generate-exchange-code'
      },
      {
        key: 'accessToken',
        name: 'Access Token',
        href: '/authentication/generate-access-token'
      },
      {
        key: 'deviceAuth',
        name: 'Device Auth',
        href: '/authentication/device-auth'
      }
    ]
  }
] satisfies Category[]);