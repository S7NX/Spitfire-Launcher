import Authentication from '$lib/core/authentication';
import PartyManager from '$lib/core/managers/party';
import { accountPartiesStore, accountsStore } from '$lib/stores';
import type { AccountData } from '$types/accounts';
import type { PartyMember } from '$types/game/party';
import * as XMPP from 'stanza';
import { EventNotifications, ServiceEvents } from '$lib/constants/events';
import type {
  ServiceEventFriendRequest,
  ServiceEventInteractionNotification,
  ServiceEventMemberConnected,
  ServiceEventMemberDisconnected,
  ServiceEventMemberExpired,
  ServiceEventMemberJoined,
  ServiceEventMemberKicked,
  ServiceEventMemberLeft,
  ServiceEventMemberNewCaptain,
  ServiceEventMemberStateUpdated,
  ServiceEventPartyPing,
  ServiceEventPartyUpdated
} from '$types/game/events';
import type { Presence } from 'stanza/protocol';
import { get } from 'svelte/store';

type EventMap = {
  [EventNotifications.MemberConnected]: ServiceEventMemberConnected;
  [EventNotifications.MemberDisconnected]: ServiceEventMemberDisconnected;
  [EventNotifications.MemberExpired]: ServiceEventMemberExpired;
  [EventNotifications.MemberJoined]: ServiceEventMemberJoined;
  [EventNotifications.MemberKicked]: ServiceEventMemberKicked;
  [EventNotifications.MemberLeft]: ServiceEventMemberLeft;
  [EventNotifications.MemberStateUpdated]: ServiceEventMemberStateUpdated;
  [EventNotifications.MemberNewCaptain]: ServiceEventMemberNewCaptain;
  [EventNotifications.PartyUpdated]: ServiceEventPartyUpdated;
  [EventNotifications.PartyInvite]: ServiceEventPartyPing;
  [EventNotifications.FriendRequest]: ServiceEventFriendRequest;
  [EventNotifications.InteractionNotification]: ServiceEventInteractionNotification;

  [ServiceEvents.SessionStarted]: void;
  [ServiceEvents.Connected]: void;
  [ServiceEvents.Disconnected]: void;
};

type AccountOptions = {
  accountId: string;
  accessToken: string;
};

type Purpose = 'autoKick' | 'taxiService' | 'botLobby' | 'customStatus';

export default class XMPPManager {
  private static instances: Map<string, XMPPManager> = new Map();
  public connection?: XMPP.Agent;
  private listeners: { [K in keyof EventMap]?: Array<(data: EventMap[K]) => void> } = {};
  private purposes: Set<Purpose>;
  private heartbeatInterval?: number;

  private reconnectInterval?: number;
  private intentionalDisconnect = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50;

  private constructor(private account: AccountOptions, purpose: Purpose) {
    this.purposes = new Set([purpose]);
  }

  static async create(account: AccountData, purpose: Purpose) {
    const existingInstance = XMPPManager.instances.get(account.accountId);
    if (existingInstance) {
      existingInstance.purposes.add(purpose);
      return existingInstance;
    }

    const accessTokenData = await Authentication.getAccessTokenUsingDeviceAuth(account, false);
    const instance = new XMPPManager({ accountId: account.accountId, accessToken: accessTokenData.access_token }, purpose);
    XMPPManager.instances.set(account.accountId, instance);

    return instance;
  }

  async connect() {
    if (this.connection?.jid) return;

    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;

    const server = 'prod.ol.epicgames.com';

    const resourceHash = window.crypto.getRandomValues(new Uint8Array(16))
      .reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '')
      .toUpperCase();

    this.connection = XMPP.createClient({
      jid: `${this.account.accountId}@${server}`,
      server,
      transports: {
        websocket: `wss://xmpp-service-${server}`,
        bosh: true
      },
      credentials: {
        host: server,
        username: this.account.accountId,
        password: this.account.accessToken
      },
      resource: `V2:Fortnite:WIN::${resourceHash}`
    });

    this.connection.enableKeepAlive({
      interval: 30
    });

    this.setupEvents();

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      this.connection!.once('session:started', () => {
        clearTimeout(timeout);
        XMPPManager.instances.set(this.account.accountId, this);
        resolve();
      });

      this.connection!.once('stream:error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.connection!.connect();
    });
  }

  disconnect() {
    this.intentionalDisconnect = true;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = undefined;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    this.dispatchEvent(ServiceEvents.Disconnected, undefined);
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
    this.listeners = {};

    XMPPManager.instances.delete(this.account.accountId);
    this.account = undefined!;
  }

  get accountId() {
    return this.account?.accountId;
  }

  removePurpose(purpose: Purpose) {
    this.purposes.delete(purpose);

    if (!this.purposes.size) this.disconnect();
  }

  private async tryReconnect() {
    if (this.intentionalDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) return;

    try {
      await this.connect();

      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = undefined;
      }

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error(error);
      this.reconnectAttempts++;
    }
  }

  private setupEvents() {
    if (!this.connection) return;

    this.connection.on('session:started', () => {
      this.dispatchEvent(ServiceEvents.SessionStarted, undefined);
    });

    this.connection.on('connected', () => {
      this.dispatchEvent(ServiceEvents.Connected, undefined);

      this.reconnectAttempts = 0;
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = undefined;
      }
    });

    this.connection.on('disconnected', async () => {
      this.dispatchEvent(ServiceEvents.Disconnected, undefined);

      if (!this.intentionalDisconnect && !this.reconnectInterval) {
        this.reconnectInterval = window.setInterval(() => this.tryReconnect(), 5000);
        await this.tryReconnect();
      }
    });

    this.connection.on('message', async (message) => {
      if (
        (message.type && message.type !== 'normal')
        || !message.body
        || message.from !== 'xmpp-admin@prod.ol.epicgames.com'
      ) return;

      let body: any;
      try {
        body = JSON.parse(message.body);
      } catch (err) {
        return;
      }

      const { type } = body;
      if (!type) return;

      const events = Object.values(EventNotifications);
      if (!events.includes(type)) return;

      switch (body.type) {
        case EventNotifications.MemberStateUpdated: {
          const data = body as ServiceEventMemberStateUpdated;
          const parties = accountPartiesStore.entries().filter(([, party]) => party.id === data.party_id).toArray();

          for (const [accountId, party] of parties) {
            const partyMember = party.members.find((member) => member.account_id === data.account_id);
            if (!partyMember) continue;

            party.revision = data.revision;
            party.updated_at = data.updated_at;
            partyMember.joined_at = data.joined_at;
            partyMember.updated_at = data.updated_at;

            if (data.member_state_removed) {
              for (const state of data.member_state_removed) {
                delete partyMember.meta[state];
              }
            }

            if (data.member_state_updated) {
              partyMember.meta = { ...partyMember.meta, ...data.member_state_updated };
            }

            if (data.member_state_overridden) {
              partyMember.meta = { ...partyMember.meta, ...data.member_state_overridden };
            }

            accountPartiesStore.set(accountId, { ...party });
          }

          break;
        }
        case EventNotifications.PartyUpdated: {
          const data = body as ServiceEventPartyUpdated;
          const parties = accountPartiesStore.entries().filter(([, party]) => party.id === data.party_id).toArray();
          if (!parties.length) break;

          for (const [accountId, party] of parties) {
            party.id = data.party_id;
            party.revision = data.revision;
            party.updated_at = data.updated_at;
            party.config = {
              ...party.config,
              type: data.party_type,
              intention_ttl: data.intention_ttl_seconds,
              invite_ttl: data.invite_ttl_seconds,
              max_size: data.max_number_of_members,
              sub_type: data.party_sub_type,
              joinability: data.party_privacy_type
            };

            party.members = party.members.map((member) => ({
              ...member,
              role: member.account_id === data.captain_id ? 'CAPTAIN' : 'MEMBER'
            }));

            if (data.party_state_removed) {
              for (const state of data.party_state_removed) {
                delete party.meta[state];
              }
            }

            if (data.party_state_updated) {
              party.meta = { ...party.meta, ...data.party_state_updated };
            }

            if (data.party_state_overridden) {
              party.meta = { ...party.meta, ...data.party_state_overridden };
            }

            accountPartiesStore.set(accountId, { ...party });
          }

          break;
        }
        case EventNotifications.MemberExpired:
        case EventNotifications.MemberLeft:
        case EventNotifications.MemberKicked: {
          const data = body as ServiceEventMemberLeft | ServiceEventMemberKicked | ServiceEventMemberExpired;

          accountPartiesStore.delete(data.account_id);

          const parties = accountPartiesStore.entries().filter(([, party]) => party.id === data.party_id).toArray();
          for (const [accountId, party] of parties) {
            party.members = party.members.filter(member => member.account_id !== data.account_id);
            party.revision = data.revision || party.revision;

            accountPartiesStore.set(accountId, { ...party });
          }

          break;
        }
        case EventNotifications.MemberJoined: {
          const data = body as ServiceEventMemberJoined;
          const parties = accountPartiesStore.entries().filter(([, party]) => party.id === data.party_id).toArray();

          const newMember: PartyMember = {
            account_id: data.account_id,
            revision: data.revision,
            connections: [data.connection],
            meta: data.member_state_updated,
            joined_at: data.joined_at,
            updated_at: data.updated_at,
            role: 'MEMBER'
          };

          for (const [accountId, party] of parties) {
            party.members = [...party.members, newMember];
            party.revision = data.revision;
            party.updated_at = data.updated_at || party.updated_at;

            accountPartiesStore.set(accountId, { ...party });
          }

          const joiningAccount = get(accountsStore).allAccounts?.find(account => account.accountId === data.account_id);
          if (joiningAccount) {
            const partyData = await PartyManager.get(joiningAccount).catch(() => null);
            if (!partyData) accountPartiesStore.delete(data.account_id);
          }

          break;
        }
        case EventNotifications.MemberNewCaptain: {
          const data = body as ServiceEventMemberNewCaptain;
          const parties = accountPartiesStore.entries().filter(([, party]) => party.id === data.party_id).toArray();

          for (const [accountId, party] of parties) {
            party.members = party.members.map((member) => ({
              ...member,
              role: member.account_id === data.account_id ? 'CAPTAIN' : 'MEMBER'
            }));

            party.revision = data.revision || party.revision;
            accountPartiesStore.set(accountId, { ...party });
          }

          break;
        }
      }

      this.dispatchEvent(type, body);
    });
  }

  setStatus(status: string, onlineType: 'online' | 'away' | 'chat' | 'dnd' | 'xa' = 'online') {
    if (!this.connection) throw new Error('Connection not established');

    const presenceData: Presence = {
      status: JSON.stringify({
        Status: status,
        bIsPlaying: false,
        bIsJoinable: false
      }),
      show: onlineType === 'online' ? undefined : onlineType
    };

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = window.setInterval(() => {
      if (!this.connection) {
        clearInterval(this.heartbeatInterval!);
        this.heartbeatInterval = undefined;
        return;
      }

      this.connection.sendPresence(presenceData);
    }, 15000);

    return this.connection.sendPresence(presenceData);
  }

  resetStatus() {
    if (!this.connection) throw new Error('Connection not established');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    return this.connection.sendPresence({
      status: JSON.stringify({
        Status: '',
        bIsPlaying: false,
        bIsJoinable: false
      })
    });
  }

  addEventListener<T extends keyof EventMap>(
    eventName: T,
    listener: (data: EventMap[T]) => void,
    options?: { signal?: AbortSignal }
  ) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(listener);

    options?.signal?.addEventListener('abort', () => {
      this.removeEventListener(eventName, listener);
    });
  }

  removeEventListener<T extends keyof EventMap>(eventName: T, listener: (data: EventMap[T]) => void) {
    const listeners = this.listeners[eventName];
    const index = listeners?.indexOf(listener) || -1;
    if (index > -1) {
      listeners!.splice(index, 1);
    }
  }

  dispatchEvent<T extends keyof EventMap>(eventName: T, data: EventMap[T]) {
    if (this.listeners[eventName]) {
      for (let i = 0; i < this.listeners[eventName].length; i++) {
        this.listeners[eventName][i](data);
      }
    }
  }
}