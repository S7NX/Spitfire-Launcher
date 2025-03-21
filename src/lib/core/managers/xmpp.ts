import * as XMPP from 'stanza';
import { EventNotifications, ServiceEvents } from '$lib/constants/events';
import type {
  ServiceEventInteractionNotification,
  ServiceEventMemberConnected,
  ServiceEventMemberDisconnected,
  ServiceEventMemberExpired,
  ServiceEventMemberJoined,
  ServiceEventMemberKicked,
  ServiceEventMemberLeft,
  ServiceEventMemberStateUpdated,
  ServiceEventPartyUpdated
} from '$types/game/events';

type EventMap = {
  [EventNotifications.MemberConnected]: ServiceEventMemberConnected;
  [EventNotifications.MemberDisconnected]: ServiceEventMemberDisconnected;
  [EventNotifications.MemberExpired]: ServiceEventMemberExpired;
  [EventNotifications.MemberJoined]: ServiceEventMemberJoined;
  [EventNotifications.MemberKicked]: ServiceEventMemberKicked;
  [EventNotifications.MemberLeft]: ServiceEventMemberLeft;
  [EventNotifications.MemberStateUpdated]: ServiceEventMemberStateUpdated;
  [EventNotifications.PartyUpdated]: ServiceEventPartyUpdated;
  [EventNotifications.InteractionNotification]: ServiceEventInteractionNotification;

  [ServiceEvents.SessionStarted]: void;
  [ServiceEvents.Connected]: void;
  [ServiceEvents.Disconnected]: void;
};

type AccountOptions = {
  accountId: string;
  accessToken: string;
};

const existingConnections: Record<string, XMPPManager> = {};

export default class XMPPManager {
  private connection?: XMPP.Agent;
  private listeners: { [K in keyof EventMap]?: Array<(data: EventMap[K]) => void> } = {};
  private reconnectInterval?: number;
  private intentionalDisconnect = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 50;

  constructor(private account: AccountOptions) {}

  async connect() {
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;

    const existingConnection = existingConnections[this.account.accountId];
    if (existingConnection) {
      this.connection = existingConnection.connection;
      return;
    }

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
        existingConnections[this.account.accountId] = this;
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

    this.dispatchEvent(ServiceEvents.Disconnected, undefined);
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
    this.listeners = {};

    delete existingConnections[this.account.accountId];
    this.account = undefined!;
  }

  private tryReconnect() {
    if (this.intentionalDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.connect()
      .then(() => {
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = undefined;
        }

        this.reconnectAttempts = 0;
      })
      .catch(error => {
        console.error(error);
        this.reconnectAttempts++;
      });
  }

  get accountId() {
    return this.account?.accountId;
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

    this.connection.on('disconnected', () => {
      this.dispatchEvent(ServiceEvents.Disconnected, undefined);

      if (!this.intentionalDisconnect && !this.reconnectInterval) {
        this.reconnectInterval = window.setInterval(() => this.tryReconnect(), 5000);
        this.tryReconnect();
      }
    });

    this.connection!.on('message', (message) => {
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

      const type = body.type as never;
      if (!type) return;

      const namespace = body.ns || body.namespace;
      if (namespace?.toLowerCase() !== 'fortnite') return;

      const events = Object.values(EventNotifications);
      if (events.includes(type)) {
        this.dispatchEvent(body.type, body);
      }
    });
  }

  setStatus(status: string, onlineType: 'online' | 'away' | 'chat' | 'dnd' | 'xa' = 'online') {
    if (!this.connection) throw new Error('Connection not established');

    return this.connection.sendPresence({
      status: JSON.stringify({
        Status: status,
        bIsPlaying: false,
        bIsJoinable: false
      }),
      show: onlineType === 'online' ? undefined : onlineType
    });
  }

  addEventListener<T extends keyof EventMap>(eventName: T, listener: (data: EventMap[T]) => void) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName]!.push(listener);
  }

  removeEventListener<T extends keyof EventMap>(eventName: T, listener: (data: EventMap[T]) => void) {
    const listeners = this.listeners[eventName];
    const index = listeners?.indexOf(listener) || -1;
    if (index > -1) {
      listeners!.splice(index, 1);
    }
  }

  hasEventListener<T extends keyof EventMap>(eventName: T, listener: (data: EventMap[T]) => void) {
    return this.listeners[eventName]?.includes(listener) || false;
  }

  dispatchEvent<T extends keyof EventMap>(eventName: T, data: EventMap[T]) {
    if (this.listeners[eventName]) {
      for (const listener of this.listeners[eventName]!) {
        listener(data);
      }
    }
  }
}