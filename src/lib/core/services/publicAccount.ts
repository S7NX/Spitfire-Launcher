import tauriKy from '$lib/core/services/tauriKy';

const publicAccountService = tauriKy.extend({
  prefixUrl: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account'
});

export default publicAccountService;
