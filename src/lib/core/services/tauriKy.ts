import ky from 'ky';
import { fetch } from '@tauri-apps/plugin-http';
import Manifest from '$lib/core/manifest';

// Used to avoid any CORS issues
const tauriKy = ky.create({
  fetch: async (input, options) => {
    const request = new Request(input, options);

    const userAgent = await Manifest.getUserAgent();
    const headers = new Headers(request.headers);
    headers.set('User-Agent', userAgent);

    const response = await fetch(request.url, {
      method: request.method,
      headers: headers,
      body: request.body ? await request.text() : undefined
    });

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    return new Response(data ? JSON.stringify(data) : null, response);
  },
  retry: 0
});

export default tauriKy;
