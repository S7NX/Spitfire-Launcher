import tauriKy from '$lib/core/services/tauriKy';

const fulfillmentService = tauriKy.extend({
  prefixUrl: 'https://fulfillment-public-service-prod.ol.epicgames.com/fulfillment/api/public'
});

export default fulfillmentService;
