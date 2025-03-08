import { defaultClient } from '$lib/constants/clients';
import tauriKy from '$lib/core/services/tauriKy';

const oauthService = tauriKy.extend({
  prefixUrl: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth',
  hooks: {
    beforeRequest: [
      async (request) => {
        if (!request.headers.has('Authorization')) {
          request.headers.set('Authorization', `Basic ${defaultClient.base64}`);
        }

        request.headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
    ]
  }
});

export default oauthService;
