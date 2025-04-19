export type EpicEventMemberConnected = {
  ns?: 'Fortnite';
  sent: string;
  connection: {
    id: string;
    meta: Record<string, string>;
    connected_at: string;
    updated_at: string;
    yield_leadership: boolean;
  };
  revision: number;
  party_id: string;
  account_id: string;
  account_dn: string;
  member_state_updated: Record<string, string>;
  joined_at: string;
  updated_at: string;
};

export type EpicEventMemberDisconnected = {
  ns?: 'Fortnite';
  sent: string;
  connection: {
    id: string;
    meta: Record<string, string>;
    connected_at: string;
    disconnected_at: string;
    updated_at: string;
    yield_leadership: boolean;
  };
  revision: number;
  expires: string;
  party_id: string;
  account_id: string;
  account_dn: string;
  member_state_updated: Record<string, string>;
  joined_at: string;
  updated_at: string;
};

export type EpicEventMemberExpired = {
  ns?: 'Fortnite';
  sent: string;
  revision: number;
  party_id: string;
  account_id: string;
  member_state_updated: Record<string, string>;
};

export type EpicEventMemberJoined = {
  ns?: 'Fortnite';
  sent: string;
  connection: {
    id: string;
    meta: Record<string, string>;
    connected_at: string;
    updated_at: string;
    yield_leadership: boolean;
  };
  revision: number;
  party_id: string;
  account_id: string;
  account_dn: string;
  member_state_updated: Record<string, string>;
  joined_at: string;
  updated_at: string;
};

export type EpicEventMemberKicked = {
  ns?: 'Fortnite';
  sent: string;
  revision: number;
  party_id: string;
  account_id: string;
  member_state_updated: Record<string, string>;
};

export type EpicEventMemberLeft = {
  ns?: 'Fortnite';
  sent: string;
  revision: number;
  party_id: string;
  account_id: string;
  member_state_updated: Record<string, string>;
};

export type EpicEventMemberStateUpdated = {
  ns?: 'Fortnite';
  sent: string;
  revision: number;
  party_id: string;
  account_id: string;
  account_dn: string;
  member_state_removed: Array<string>;
  member_state_updated: Record<string, string>;
  member_state_overridden: Record<string, string>;
  joined_at: string;
  updated_at: string;
};

export type EpicEventMemberNewCaptain = {
  ns?: 'Fortnite';
  sent: string;
  revision: number;
  party_id: string;
  account_id: string;
  account_dn: string;
  member_state_updated: Record<string, string>;
  joined_at: string;
  updated_at: string;
};

export type EpicEventPartyUpdated = {
  ns?: 'Fortnite';
  sent: string;
  party_id: string;
  captain_id: string;
  party_state_removed: Array<string>;
  party_state_updated: Record<string, string>;
  party_state_overridden: Record<string, string>;
  party_privacy_type: 'OPEN' | 'INVITE_AND_FORMER';
  party_type: 'DEFAULT';
  party_sub_type: 'default';
  max_number_of_members: number;
  invite_ttl_seconds: number;
  intention_ttl_seconds: number;
  created_at: string;
  updated_at: string;
  revision: number;
};

export type EpicEventInteractionNotification = {
  ns?: 'Fortnite';
  interactions: Array<{
    namespace?: 'Fortnite';
    fromAccountId: string;
    toAccountId: string;
    app: string;
    interactionType: 'GamePlayed' | 'PartyInviteSent' | 'PartyJoined' | 'PingSent';
    happenedAt: number;
    interactionScoreIncremental: {
      total: number;
      count: number;
    };
    resultsIncremental: {
      timePlayed: number;
      playlist: number;
      gameType_StW: number;
      timePlayedActive: number;
      startAt: number;
    };
    resultsAction: 'ADD';
    interactionId: string;
    isFriend: boolean;
  }>;
};

export type EpicEventPartyPing = {
  ns?: 'Fortnite';
  pinger_dn: string;
  pinger_id: string;
  expires: string;
  sent: string;
  meta: Record<string, string>;
};


export type EpicEventFriendRequest = {
  from: string;
  to: string;
  status: 'PENDING' | 'ACCEPTED';
  timestamp: string;
};

export type EpicEventFriendRemoved = {
  from: string;
  to: string;
  reason: 'DELETED';
  timestamp: string;
}