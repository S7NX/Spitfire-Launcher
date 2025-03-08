import { z } from 'zod';

import { allSettingsSchema, appSettingsSchema, deviceAuthsSettingsSchema } from '$lib/validations/settings';

export type AppSettings = z.infer<typeof appSettingsSchema>
export type DeviceAuthsSettings = z.infer<typeof deviceAuthsSettingsSchema>
export type AllSettings = z.infer<typeof allSettingsSchema>