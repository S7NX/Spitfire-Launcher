import * as XMPP from 'stanza';
import { EventNotifications, ServiceEvents } from '$lib/constants/events';
import type { ServiceEventInteractionNotification, ServiceEventMemberConnected, ServiceEventMemberDisconnected, ServiceEventMemberExpired, ServiceEventMemberJoined, ServiceEventMemberKicked, ServiceEventMemberLeft, ServiceEventMemberStateUpdated, ServiceEventPartyUpdated } from '$types/game/events';

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

  constructor(private account: AccountOptions) {
    if (existingConnections[this.account.accountId]) {
      existingConnections[this.account.accountId].disconnect();
    }

    existingConnections[this.account.accountId] = this;
  }

  async connect() {
    if (this.connection) this.disconnect();

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
    this.dispatchEvent('disconnected', undefined);
    this.connection?.removeAllListeners();
    this.connection?.disconnect();
    this.connection = undefined;
    this.listeners = {};
    this.account = undefined!;
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
    });

    this.connection.on('disconnected', () => {
      this.dispatchEvent(ServiceEvents.Disconnected, undefined);
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