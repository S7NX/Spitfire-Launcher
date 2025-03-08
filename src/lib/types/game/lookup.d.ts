export type EpicAccountById = {
  id: string;
  displayName: string;
  minorVerified: boolean;
  minorStatus: string;
  cabinedMode: boolean;
  externalAuths: ExternalAuths;
};

export type EpicAccountByName = {
  id: string;
  displayName: string;
  externalAuths: ExternalAuths;
};

type ExternalAuths = Record<
  string,
  {
    accountId: string;
    type: string;
    externalAuthId?: string;
    externalAuthIdType: string;
    externalDisplayName?: string;
    authIds: {
      id: string;
      type: string;
    }[];
  }
>;