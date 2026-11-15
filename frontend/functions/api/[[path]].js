/** Same-origin API gateway: no database credentials or backend tokens belong here. */
export async function proxyRequest(request, env, send = fetch) {
  const incoming = new URL(request.url);
  let backend;
  try {
    backend = new URL(env.BACKEND_ORIGIN);
    const local =
      ['localhost', '127.0.0.1'].includes(incoming.hostname) &&
      ['localhost', '127.0.0.1'].includes(backend.hostname);
    if (
      (backend.protocol !== 'https:' && !(local && backend.protocol === 'http:')) ||
      backend.username ||
      backend.password ||
      backend.pathname !== '/' ||
      backend.search ||
      backend.hash ||
      backend.origin === incoming.origin
    ) {
      throw new Error('Invalid backend origin');
    }
  } catch {
    return unavailable('API gateway configuration is missing or invalid.');
  }
  // Never resolve a browser-controlled //path against the configured upstream origin.
  backend.pathname = incoming.pathname;
  backend.search = incoming.search;
  if (!incoming.pathname.startsWith('/api/')) return new Response(null, { status: 404 });
  const headers = new Headers(request.headers);
  for (const name of [
    'host',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-forwarded-prefix',
  ])
    headers.delete(name);
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', incoming.protocol.slice(0, -1));
  // Forward Origin unchanged: Spring validates it against FRONTEND_ORIGIN.
  const init = { method: request.method, headers, redirect: 'manual', signal: request.signal };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  try {
    const upstream = await send(backend.href, init);
    // Clone Headers directly: flattening headers would merge separate Set-Cookie values.
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');
    const location = responseHeaders.get('Location');
    if (location) {
      const target = new URL(location, backend);
      if (target.origin === backend.origin)
        responseHeaders.set(
          'Location',
          incoming.origin + target.pathname + target.search + target.hash,
        );
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return unavailable('The demo is starting or temporarily unavailable. Try again shortly.');
  }
}
function unavailable(message) {
  return Response.json(
    { code: 'BACKEND_UNAVAILABLE', message },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function onRequest({ request, env }) {
  return proxyRequest(request, env);
}
