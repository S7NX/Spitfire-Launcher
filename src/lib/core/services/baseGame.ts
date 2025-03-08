import tauriKy from '$lib/core/services/tauriKy';

const baseGameService = tauriKy.extend({
  prefixUrl: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2'
});

export default baseGameService;
