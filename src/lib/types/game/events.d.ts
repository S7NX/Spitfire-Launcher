export type ServiceEventMemberConnected = {
  ns?: 'Fortnite';
  sent: string
  connection: {
    id: string
    meta: Partial<Record<string, string>>
    connected_at: string
    updated_at: string
    yield_leadership: boolean
  }
  revision: number
  party_id: string
  account_id: string
  account_dn: string
  member_state_updated: Partial<Record<string, string>>
  joined_at: string
  updated_at: string
}

export type ServiceEventMemberDisconnected = {
  ns?: 'Fortnite';
  sent: string
  connection: {
    id: string
    meta: Partial<Record<string, string>>
    connected_at: string
    disconnected_at: string
    updated_at: string
    yield_leadership: boolean
  }
  revision: number
  expires: string
  party_id: string
  account_id: string
  account_dn: string
  member_state_updated: Partial<Record<string, string>>
  joined_at: string
  updated_at: string
}

export type ServiceEventMemberExpired = {
  ns?: 'Fortnite';
  sent: string
  revision: number
  party_id: string
  account_id: string
  member_state_updated: Partial<Record<string, string>>
}

export type ServiceEventMemberJoined = {
  ns?: 'Fortnite';
  sent: string
  connection: {
    id: string
    meta: Partial<Record<string, string>>
    connected_at: string
    updated_at: string
    yield_leadership: boolean
  }
  revision: number
  party_id: string
  account_id: string
  account_dn: string
  member_state_updated: Partial<Record<string, string>>
  joined_at: string
  updated_at: string
}

export type ServiceEventMemberKicked = {
  ns?: 'Fortnite';
  sent: string
  revision: number
  party_id: string
  account_id: string
  member_state_updated: Partial<Record<string, string>>
}

export type ServiceEventMemberLeft = {
  ns?: 'Fortnite';
  sent: string
  revision: number
  party_id: string
  account_id: string
  member_state_updated: Partial<Record<string, string>>
}

export type ServiceEventMemberStateUpdated = {
  ns?: 'Fortnite';
  sent: string
  revision: 2
  party_id: string
  account_id: string
  account_dn: string
  member_state_removed: Array<unknown>
  member_state_updated: Partial<Record<string, string>>
  member_state_overridden: Partial<Record<string, string>>
  joined_at: string
  updated_at: string
}

export type ServiceEventPartyUpdated = {
  ns?: 'Fortnite';
  sent: string
  party_id: string
  captain_id: string
  party_state_removed: Array<unknown>
  party_state_updated: Partial<Record<string, string>>
  party_state_overridden: Partial<Record<string, string>>
  party_privacy_type: 'OPEN' | 'INVITE_AND_FORMER';
  party_type: 'DEFAULT'
  party_sub_type: 'default'
  max_number_of_members: number
  invite_ttl_seconds: number
  intention_ttl_seconds: number
  created_at: string
  updated_at: string
  revision: number
}

export type ServiceEventInteractionNotification = {
  ns?: 'Fortnite';
  interactions: Array<InteractionNotification>
}

export type InteractionNotification = {
  namespace?: 'Fortnite';
  fromAccountId: string
  toAccountId: string
  app: 'Save_The_World'
  interactionType: 'GamePlayed' | 'PartyInviteSent' | 'PartyJoined' | 'PingSent'
  happenedAt: number
  interactionScoreIncremental: {
    total: number
    count: number
  }
  resultsIncremental: {
    timePlayed: number
    playlist: number
    gameType_StW: number
    timePlayedActive: number
    startAt: number
  }
  resultsAction: 'ADD'
  interactionId: string
  isFriend: boolean
}

export type MatchMakingData = {
  ns?: 'Fortnite';
  partyState: PartyState | null
  started: boolean
}
