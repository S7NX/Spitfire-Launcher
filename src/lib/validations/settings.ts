import { z } from 'zod';

export const appSettingsSchema = z.object({
  userAgent: z.string().optional(),
  gamePath: z.string().optional(),
  missionCheckInterval: z.number().positive().optional(),
  startingPage: z.enum(['AUTO_KICK', 'BR_ITEM_SHOP', 'STW_WORLD_INFO', 'DAILY_QUESTS']).default('STW_WORLD_INFO').optional(),
  startingAccount: z.enum(['FIRST_IN_LIST', 'LAST_USED']).default('FIRST_IN_LIST').optional(),
  hideToTray: z.boolean().optional(),
  checkForUpdates: z.boolean().optional()
});

export const deviceAuthsSettingsSchema = z.array(z.object({
  deviceId: z.string(),
  customName: z.string()
}));

export const allSettingsSchema = z.object({
  app: appSettingsSchema.optional(),
  deviceAuths: deviceAuthsSettingsSchema.optional()
});

export const automationSettingSchema = z.object({
  accountId: z.string(),
  autoKick: z.boolean().optional(),
  autoClaim: z.boolean().optional(),
  autoTransferMaterials: z.boolean().optional()
});

export const automationSettingsSchema = z.array(automationSettingSchema);