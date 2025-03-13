import tauriKy from '$lib/core/services/tauriKy';

const matchmakingService = tauriKy.extend({
  prefixUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/matchmaking/session'
});

export default matchmakingService;
