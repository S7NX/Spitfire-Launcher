import tauriKy from '$lib/core/services/tauriKy';

const matchmakingService = tauriKy.extend({
  prefixUrl: 'https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite'
});

export default matchmakingService;
