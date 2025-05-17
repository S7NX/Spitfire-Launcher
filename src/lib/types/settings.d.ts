import { z } from 'zod';

import {
  allSettingsSchema,
  appSettingsSchema,
  automationSettingSchema,
  automationSettingsSchema,
  customizableMenuSettingsSchema,
  deviceAuthsSettingsSchema,
  taxiSettingSchema,
  taxiSettingsSchema,
  botLobbySettingSchema,
  botLobbySettingsSchema,
} from '$lib/validations/settings';

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type CustomizableMenuSettings = z.infer<typeof customizableMenuSettingsSchema>;
export type DeviceAuthsSettings = z.infer<typeof deviceAuthsSettingsSchema>;
export type AllSettings = z.infer<typeof allSettingsSchema>;
export type AutomationSetting = z.infer<typeof automationSettingSchema>;
export type AutomationSettings = z.infer<typeof automationSettingsSchema>;
export type TaxiSetting = z.infer<typeof taxiSettingSchema>;
export type TaxiSettings = z.infer<typeof taxiSettingsSchema>;
export type BotLobbySetting = z.infer<typeof botLobbySettingSchema>;
export type BotLobbySettings = z.infer<typeof botLobbySettingsSchema>;