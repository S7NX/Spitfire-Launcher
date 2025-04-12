import { z } from 'zod';

export const appSettingsSchema = z.object({
  gamePath: z.string(),
  missionCheckInterval: z.number().positive(),
  claimRewardsDelay: z.number().positive(),
  startingPage: z.enum(['autoKick', 'itemShop', 'stwWorldInfo', 'taxiService', 'botLobby', 'dailyQuests']),
  startingAccount: z.enum(['firstInTheList', 'lastUsed']),
  hideToTray: z.boolean(),
  checkForUpdates: z.boolean()
}).partial();

export const deviceAuthsSettingsSchema = z.array(z.object({
  deviceId: z.string(),
  customName: z.string()
}));

export const customizableMenuSettingsSchema = z.object({
  vbucksInformation: z.boolean().default(true),
  redeemCodes: z.boolean().default(true),
  epicGamesSettings: z.boolean().default(true),
  eula: z.boolean().default(true),

  autoKick: z.boolean().default(true),
  taxiService: z.boolean().default(true),
  botLobby: z.boolean().default(true),
  customStatus: z.boolean().default(true),
  partyManagement: z.boolean().default(true),
  serverStatus: z.boolean().default(true),
  itemShop: z.boolean().default(true),
  earnedXp: z.boolean().default(true),
  dailyQuests: z.boolean().default(true),
  stwWorldInfo: z.boolean().default(true),
  lookupPlayers: z.boolean().default(true),

  exchangeCode: z.boolean().default(true),
  accessToken: z.boolean().default(true),
  deviceAuth: z.boolean().default(true)
}).partial();

export const allSettingsSchema = z.object({
  app: appSettingsSchema,
  customizableMenu: customizableMenuSettingsSchema
}).partial();

export const automationSettingSchema = z.object({
  accountId: z.string(),
  autoKick: z.boolean().optional(),
  autoClaim: z.boolean().optional(),
  autoTransferMaterials: z.boolean().optional()
});

export const automationSettingsSchema = z.array(automationSettingSchema);

export const taxiSettingSchema = z.object({
  accountId: z.string(),
  availableStatus: z.string().optional(),
  busyStatus: z.string().optional()
});

export const taxiSettingsSchema = z.array(taxiSettingSchema);

export const botLobbySettingSchema = z.object({
  accountId: z.string(),
  availableStatus: z.string().optional(),
  busyStatus: z.string().optional()
});

export const botLobbySettingsSchema = z.array(botLobbySettingSchema);