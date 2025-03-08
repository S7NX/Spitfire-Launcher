import { z } from 'zod';

export const appSettingsSchema = z.object({
  userAgent: z.string().optional(),
  gamePath: z.string().optional(),
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