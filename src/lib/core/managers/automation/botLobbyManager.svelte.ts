import { EpicEvents } from '$lib/constants/events';
import Authentication from '$lib/core/authentication';
import TaxiManager from '$lib/core/managers/automation/taxiManager.svelte';
import FriendManager from '$lib/core/managers/friend';
import MCPManager from '$lib/core/managers/mcp';
import PartyManager from '$lib/core/managers/party';
import XMPPManager from '$lib/core/managers/xmpp';
import Manifest from '$lib/core/manifest';
import { accountPartiesStore } from '$lib/stores';
import WebSocket from '@tauri-apps/plugin-websocket';
import EpicAPIError from '$lib/exceptions/EpicAPIError';
import { SvelteSet } from 'svelte/reactivity';
import { baseGameService, matchmakingService } from '$lib/core/services';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { t } from '$lib/utils/util';
import type { AccountData } from '$types/accounts';
import type { MatchmakingTrackResponse } from '$types/game/matchmaking';
import type { PartyData } from '$types/game/party';
import type {
  EpicEventFriendRequest,
  EpicEventMemberKicked,
  EpicEventMemberLeft,
  EpicEventMemberStateUpdated,
  EpicEventPartyPing, EpicEventPartyUpdated
} from '$types/game/events';

type TicketResponse = {
  payload: string;
  serviceUrl: string;
  signature: string;
  ticketType: string;
};

export default class BotLobbyManager {
  private websocket?: WebSocket;
  private xmpp?: XMPPManager;
  private abortController?: AbortController;
  private partyTimeoutId?: number;
  public static readonly botLobbyAccountIds: SvelteSet<string> = new SvelteSet();
  public active = $state(false);
  public isStarting = $state(false);
  public isStopping = $state(false);
  public isAvailable = $state(false);
  public availableStatus = $state(get(t)('botLobby.settings.availableStatus.default'));
  public busyStatus = $state(get(t)('botLobby.settings.busyStatus.default'));
  public autoAcceptFriendRequests = $state(false);
  public partyTimeoutSeconds = $state(180);

  constructor(private account: AccountData) { }

  async start() {
    if (TaxiManager.taxiAccountIds.has(this.account.accountId)) {
      toast.error(get(t)('botLobby.taxiServiceActive'));
      return;
    }

    this.isStarting = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      this.xmpp = await XMPPManager.create(this.account, 'botLobby');
      await this.xmpp.connect();

      this.xmpp.addEventListener(EpicEvents.PartyInvite, this.handleInvite.bind(this), { signal });
      this.xmpp.addEventListener(EpicEvents.FriendRequest, this.handleFriendRequest.bind(this), { signal });
      this.xmpp.addEventListener(EpicEvents.MemberLeft, this.handlePartyStateChange.bind(this), { signal });
      this.xmpp.addEventListener(EpicEvents.MemberKicked, this.handlePartyStateChange.bind(this), { signal });
      this.xmpp.addEventListener(EpicEvents.MemberStateUpdated, this.handlePartyStateChange.bind(this), { signal });
      this.xmpp.addEventListener(EpicEvents.PartyUpdated, this.handlePartyStateChange.bind(this), { signal });

      this.setIsAvailable(true);

      await PartyManager.get(this.account);

      this.active = true;
      BotLobbyManager.botLobbyAccountIds.add(this.account.accountId);

      await this.handleFriendRequests();
    } catch (error) {
      this.isStarting = false;
      this.active = false;
      BotLobbyManager.botLobbyAccountIds.delete(this.account.accountId);

      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  async stop() {
    this.isStopping = true;

    if (this.partyTimeoutId) {
      window.clearTimeout(this.partyTimeoutId);
      this.partyTimeoutId = undefined;
    }

    this.abortController?.abort();
    this.abortController = undefined;

    this.xmpp?.removePurpose('botLobby');
    this.xmpp = undefined;

    await this.disconnectWebSocket();

    this.isStopping = false;
    this.active = false;
    BotLobbyManager.botLobbyAccountIds.delete(this.account.accountId);
  }

  async handleFriendRequests() {
    if (!this.active || !this.autoAcceptFriendRequests) return;

    const incomingRequests = await FriendManager.getIncoming(this.account);
    if (incomingRequests.length) await FriendManager.acceptAllIncomingRequests(this.account, incomingRequests.map(x => x.accountId));
  }

  setIsAvailable(available: boolean) {
    if (available) {
      this.xmpp?.setStatus(this.availableStatus, 'online');
      this.isAvailable = true;
    } else {
      this.xmpp?.setStatus(this.busyStatus, 'away');
      this.isAvailable = false;
    }
  }

  private async createConnection() {
    const [partyResponse, netcl] = await Promise.all([
      PartyManager.get(this.account),
      this.getNetcl()
    ]);

    const party = partyResponse.current[0];

    let ticketData: TicketResponse;

    try {
      ticketData = await this.generateTicket(party, netcl);
    } catch (error) {
      if (error instanceof EpicAPIError && error.errorCode === 'errors.com.epicgames.fortnite.player_banned_from_sub_game') {
        toast.error(get(t)('botLobby.matchmakingBan.default'));
        await PartyManager.leave(this.account, party.id).catch(() => null);
        await MCPManager.compose(this.account, 'SetMatchmakingBansViewed', 'common_core', {}).catch(() => null);
        await this.stop();
      }

      throw error;
    }

    const checksum = await this.calculateChecksum(ticketData.payload, ticketData.signature);
    this.websocket = await WebSocket.connect(ticketData.serviceUrl, {
      headers: {
        Authorization: `Epic-Signed mms-player ${ticketData.payload} ${ticketData.signature} ${checksum}`
      }
    });

    this.websocket.addListener(async (message) => {
      if (message.type !== 'Text') return;

      const data = JSON.parse(message.data);
      if (data.name === 'Play') {
        await this.disconnectWebSocket();
      }
    });
  }

  private async generateTicket(party: PartyData, netcl: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(this.account);

    const playlist = JSON.parse(party.meta['Default:SelectedIsland_j']).SelectedIsland.linkId.mnemonic;
    const queryParameters = new URLSearchParams({
      partyPlayerIds: party.members.map((member) => member.account_id).join(','),
      bucketId: `${netcl}:1:${party.meta['Default:RegionId_s']}:${playlist}`,
      'player.platform': 'Windows',
      'player.subregions': 'DE,GB,FR',
      'player.option.linkCode': playlist,
      'player.option.fillTeam': party.meta['Default:PreferredPrivacy_s'] === 'Fill' ? 'true' : 'false',
      'player.option.preserveSquad': 'false',
      'player.option.crossplayOptOut': 'false',
      'player.option.partyId': party.id,
      'player.option.splitScreen': 'false',
      'party.WIN': 'true',
      'input.KBM': 'true',
      'player.input': 'KBM',
      'player.option.microphoneEnabled': 'true',
      'player.option.uiLanguage': 'en'
    });

    return await baseGameService.get<TicketResponse>(
      `matchmakingservice/ticket/player/${this.account.accountId}?${queryParameters}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-User-Agent': await this.getFormattedUserAgent()
        }
      }
    ).json();
  }

  private async calculateChecksum(ticketPayload: string, signature: string) {
    const plaintext = `${ticketPayload.slice(10, 20)}Don'tMessWithMMS${signature.slice(2, 10)}`;

    const encoder = new TextEncoder();
    const utf8Data = encoder.encode(plaintext);
    const utf16Data = new Uint8Array(utf8Data.length * 2);

    for (let i = 0; i < utf8Data.length; i++) {
      utf16Data[i * 2] = utf8Data[i];
      utf16Data[i * 2 + 1] = 0;
    }

    const hashBuffer = await window.crypto.subtle.digest('SHA-1', utf16Data);
    return Array.from(new Uint8Array(hashBuffer)).slice(2, 10).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  private async getNetcl() {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(this.account);
    const response = await matchmakingService.post<MatchmakingTrackResponse>('matchMakingRequest', {
      json: {
        criteria: [],
        openPlayersRequired: 1,
        buildUniqueId: '',
        maxResults: 1
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();

    return response[0].buildUniqueId;
  }

  private async getFormattedUserAgent() {
    const userAgent = await Manifest.getUserAgent();
    return `Fortnite/${userAgent.split('/')[1].slice(0, -8)} Windows/10`;
  }

  private async disconnectWebSocket() {
    if (this.websocket) {
      await this.websocket.disconnect().catch(() => null);
      this.websocket = undefined;
    }
  }

  private async handleInvite(invite: EpicEventPartyPing) {
    const currentParty = accountPartiesStore.get(this.account.accountId);
    if (currentParty?.members.length === 1) {
      await PartyManager.leave(this.account, currentParty.id);
      accountPartiesStore.delete(this.account.accountId);
    }

    const [inviterPartyData] = await PartyManager.getInviterParty(this.account, invite.pinger_id);
    await PartyManager.acceptInvite(this.account, inviterPartyData.id, invite.pinger_id, this.xmpp!.connection!.jid);
    await PartyManager.get(this.account);

    this.setIsAvailable(false);

    if (this.partyTimeoutId) {
      window.clearTimeout(this.partyTimeoutId);
    }

    this.partyTimeoutId = window.setTimeout(async () => {
      const currentParty = accountPartiesStore.get(this.account.accountId);
      if (currentParty) {
        await PartyManager.leave(this.account, currentParty.id);
        accountPartiesStore.delete(this.account.accountId);
        this.setIsAvailable(true);
      }

      this.partyTimeoutId = undefined;
    }, this.partyTimeoutSeconds * 1000);
    await this.disconnectWebSocket();
  }

  private async handlePartyStateChange(event: EpicEventMemberLeft | EpicEventMemberKicked | EpicEventMemberStateUpdated | EpicEventPartyUpdated) {
    const currentParty = accountPartiesStore.get(this.account.accountId);
    const isInParty = (currentParty?.members.length || 0) > 1;

    if ('party_state_updated' in event && currentParty) {
      const matchmakingCancelled = event.party_state_updated['Default:CreativeInGameReadyCheckStatus_s'] === 'None';
      if (matchmakingCancelled) {
        await this.disconnectWebSocket();
        return;
      }
    }

    if ('member_state_updated' in event && currentParty) {
      const packedStateMeta = JSON.parse(event.member_state_updated['Default:PackedState_j'] || '{}');
      if (packedStateMeta?.PackedState?.location === 'InGame') {
        return await PartyManager.leave(this.account, currentParty.id);
      }

      const botMember = currentParty.members.find(x => x.account_id === this.account.accountId)!;
      const botLobbyStateMeta = JSON.parse(botMember.meta['Default:LobbyState_j'] || '{}');
      const isBotReady = botLobbyStateMeta.LobbyState?.gameReadiness === 'Ready';

      const allOtherMembersReady = currentParty.members.every(x => {
        const lobbyState = JSON.parse(x.meta['Default:LobbyState_j'] || '{}')?.LobbyState;
        return lobbyState?.gameReadiness === 'Ready' || x.account_id === this.account.accountId;
      });

      if (allOtherMembersReady) {
        if (!this.websocket) {
          await this.createConnection();
        }

        if (!isBotReady) {
          botLobbyStateMeta.LobbyState.gameReadiness = 'Ready';

          await PartyManager.sendPatch(this.account, currentParty.id, event.revision, {
            'Default:LobbyState_j': JSON.stringify(botLobbyStateMeta)
          }, true);
        }
      }
    }

    if (isInParty) {
      this.setIsAvailable(false);
    } else {
      this.setIsAvailable(true);

      if (this.partyTimeoutId) {
        window.clearTimeout(this.partyTimeoutId);
        this.partyTimeoutId = undefined;
      }
    }
  }

  private async handleFriendRequest(request: EpicEventFriendRequest) {
    if (!this.autoAcceptFriendRequests || request.status !== 'PENDING') return;

    await FriendManager.addFriend(this.account, request.from);
  }
}