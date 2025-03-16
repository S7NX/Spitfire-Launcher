import tauriKy from '$lib/core/services/tauriKy';

const friendService = tauriKy.extend({
  prefixUrl: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/v1/'
});

export default friendService;
