import { z } from 'zod';

import { allSettingsSchema, appSettingsSchema, automationSettingSchema, automationSettingsSchema, deviceAuthsSettingsSchema } from '$lib/validations/settings';

export type AppSettings = z.infer<typeof appSettingsSchema>
export type DeviceAuthsSettings = z.infer<typeof deviceAuthsSettingsSchema>
export type AllSettings = z.infer<typeof allSettingsSchema>
export type AutomationSetting = z.infer<typeof automationSettingSchema>
export type AutomationSettings = z.infer<typeof automationSettingsSchema>