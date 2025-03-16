import friendService from '$lib/core/services/friend';
import type { AccountData } from '$types/accounts';
import Authentication from '$lib/core/authentication';
import type { BlockedAccountData, FriendData, FriendsSummary, IncomingFriendRequestData, OutgoingFriendRequestData } from '$types/game/friends';

// todo: find a better way to handle duplicate codes in the future
// maybe create a base class called "Profile" like spitfire bot idk

export default class FriendManager {
  static async getFriend(account: AccountData, friendId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<FriendData>(`${account.accountId}/friends/${friendId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async addFriend(account: AccountData, friendId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.post(`${account.accountId}/friends/${friendId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async removeFriend(account: AccountData, friendId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.delete(`${account.accountId}/friends/${friendId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  static async removeAll(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.delete(`${account.accountId}/friends`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  static async getSummary(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<FriendsSummary>(`${account.accountId}/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async getFriends(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<FriendData[]>(`${account.accountId}/friends`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async getIncoming(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<IncomingFriendRequestData[]>(`${account.accountId}/incoming`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async getOutgoing(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<OutgoingFriendRequestData[]>(`${account.accountId}/outgoing`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async getBlocklist(account: AccountData) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.get<BlockedAccountData[]>(`${account.accountId}/blocklist`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async block(account: AccountData, friendId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.post(`${account.accountId}/blocklist/${friendId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).json();
  }

  static async unblock(account: AccountData, friendId: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.delete(`${account.accountId}/blocklist/${friendId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  static async changeNickname(account: AccountData, friendId: string, nickname: string) {
    const accessToken = await Authentication.verifyOrRefreshAccessToken(account);

    return friendService.put(`${account.accountId}/friends/${friendId}/alias`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Bearer ${accessToken}`
      },
      body: nickname
    });
  }
}