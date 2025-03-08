import { z } from 'zod';

import { accountDataFileSchema, accountDataListSchema, accountDataSchema } from '$lib/validations/accounts';

export type AccountData = z.infer<typeof accountDataSchema>
export type AccountDataList = z.infer<typeof accountDataListSchema>
export type AccountDataFile = z.infer<typeof accountDataFileSchema>

export type AccessTokenCache = {
  [key: string]: {
    accessToken: string;
    expiresAt: Date;
  }
}