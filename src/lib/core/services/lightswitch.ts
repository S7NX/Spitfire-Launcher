import tauriKy from '$lib/core/services/tauriKy';

const lightswitchService = tauriKy.extend({
  prefixUrl: 'https://lightswitch-public-service-prod.ol.epicgames.com/lightswitch/api/service'
});

export default lightswitchService;
