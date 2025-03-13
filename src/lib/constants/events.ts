export type EventNotification = typeof EventNotifications[keyof typeof EventNotifications]

export const EventNotifications = Object.freeze({
  MemberConnected: 'com.epicgames.social.party.notification.v0.MEMBER_CONNECTED',
  MemberDisconnected: 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED',
  MemberExpired: 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED',
  MemberJoined: 'com.epicgames.social.party.notification.v0.MEMBER_JOINED',
  MemberKicked: 'com.epicgames.social.party.notification.v0.MEMBER_KICKED',
  MemberLeft: 'com.epicgames.social.party.notification.v0.MEMBER_LEFT',
  MemberStateUpdated: 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED',

  PartyUpdated: 'com.epicgames.social.party.notification.v0.PARTY_UPDATED',

  InteractionNotification: 'com.epicgames.social.interactions.notification.v2'
} as const);

export type ServiceEvent = typeof ServiceEvents[keyof typeof ServiceEvents]

export const ServiceEvents = Object.freeze({
  SessionStarted: 'session:started',
  Connected: 'connected',
  Disconnected: 'disconnected',
  Destroy: 'destroy'
} as const);

export type PartyState = typeof PartyStates[keyof typeof PartyStates]

export const PartyStates = Object.freeze({
  Matchmaking: 'Matchmaking',
  PostMatchmaking: 'PostMatchmaking',
  TheaterView: 'TheaterView',
  WorldView: 'WorldView'
} as const);