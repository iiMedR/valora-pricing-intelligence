import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
// Load the same standalone Pages module without changing the Angular package module type.
const source = await readFile(
  new URL("../frontend/functions/api/[[path]].js", import.meta.url),
  "utf8",
);
const { proxyRequest } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const env = { BACKEND_ORIGIN: "https://valora-backend.onrender.com" };
test("forwards method, body, query, session and CSRF while preserving Origin", async () => {
  const request = new Request(
    "https://valora.pages.dev/api/v1/auth/login?return=dashboard",
    {
      method: "POST",
      headers: {
        Cookie: "SP_PORTFOLIO_SESSION=test",
        Origin: "https://valora.pages.dev",
        "X-XSRF-TOKEN": "csrf",
        "Content-Type": "application/json",
        "X-Forwarded-Host": "attacker.test",
        Forwarded: "host=attacker.test",
      },
      body: '{"username":"demo"}',
    },
  );
  const response = await proxyRequest(request, env, async (url, init) => {
    assert.equal(
      url,
      "https://valora-backend.onrender.com/api/v1/auth/login?return=dashboard",
    );
    assert.equal(init.method, "POST");
    assert.equal(await new Response(init.body).text(), '{"username":"demo"}');
    assert.equal(init.headers.get("Cookie"), "SP_PORTFOLIO_SESSION=test");
    assert.equal(init.headers.get("X-XSRF-TOKEN"), "csrf");
    assert.equal(init.headers.get("Origin"), "https://valora.pages.dev");
    assert.equal(init.headers.get("X-Forwarded-Host"), "valora.pages.dev");
    assert.equal(init.headers.get("X-Forwarded-Proto"), "https");
    assert.equal(init.headers.get("Forwarded"), null);
    assert.equal(init.redirect, "manual");
    return Response.json({ authenticated: true });
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("preserves separate Set-Cookie headers and HttpOnly/Secure attributes", async () => {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    "SP_PORTFOLIO_SESSION=session; Path=/; Secure; HttpOnly; SameSite=Lax",
  );
  headers.append("Set-Cookie", "XSRF-TOKEN=csrf; Path=/; Secure; SameSite=Lax");
  const r = await proxyRequest(
    new Request("https://valora.pages.dev/api/v1/auth/csrf"),
    env,
    async () => new Response("{}", { headers }),
  );
  assert.equal(r.headers.getSetCookie().length, 2);
  assert.match(r.headers.getSetCookie()[0], /HttpOnly/);
});
test("does not turn upstream authentication and CSRF failures into successful responses", async () => {
  for (const status of [401, 403]) {
    const r = await proxyRequest(
      new Request("https://valora.pages.dev/api/v1/products"),
      env,
      async () => Response.json({ code: "ACCESS_DENIED" }, { status }),
    );
    assert.equal(r.status, status);
    assert.equal((await r.json()).code, "ACCESS_DENIED");
  }
});
test("unconfigured or invalid upstream fails closed", async () => {
  for (const origin of [
    undefined,
    "http://internal.test",
    "https://user:secret@backend.test",
    "https://backend.test/path",
    "https://backend.test?target=x",
    "https://valora.pages.dev",
  ]) {
    let sent = false;
    const r = await proxyRequest(
      new Request("https://valora.pages.dev/api/v1/health"),
      { BACKEND_ORIGIN: origin },
      async () => {
        sent = true;
      },
    );
    assert.equal(r.status, 503);
    assert.equal(sent, false);
  }
});
test("local HTTP upstream is permitted only from local development", async () => {
  const send = async () => new Response("UP");
  assert.equal(
    (
      await proxyRequest(
        new Request("http://localhost:8788/api/v1/health"),
        { BACKEND_ORIGIN: "http://127.0.0.1:8089" },
        send,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await proxyRequest(
        new Request("https://valora.pages.dev/api/v1/health"),
        { BACKEND_ORIGIN: "http://127.0.0.1:8089" },
        send,
      )
    ).status,
    503,
  );
});
test("does not create an open proxy from a browser-controlled path", async () => {
  const r = await proxyRequest(
    new Request("https://valora.pages.dev/api//evil.test/x"),
    env,
    async (url) => {
      assert.equal(new URL(url).origin, env.BACKEND_ORIGIN);
      return new Response("OK");
    },
  );
  assert.equal(r.status, 200);
});
test("rewrites same-backend redirects without following them", async () => {
  const r = await proxyRequest(
    new Request("https://valora.pages.dev/api/v1/example"),
    env,
    async () =>
      new Response(null, {
        status: 302,
        headers: {
          Location: "https://valora-backend.onrender.com/api/v1/other",
        },
      }),
  );
  assert.equal(r.status, 302);
  assert.equal(
    r.headers.get("Location"),
    "https://valora.pages.dev/api/v1/other",
  );
});
test("backend network failures give a safe retry message and cannot be cached", async () => {
  const r = await proxyRequest(
    new Request("https://valora.pages.dev/api/v1/health"),
    env,
    async () => {
      throw Error("private details");
    },
  );
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("Cache-Control"), "no-store");
  assert.equal((await r.json()).code, "BACKEND_UNAVAILABLE");
});
test("non-API paths are never forwarded", async () => {
  let called = false;
  const r = await proxyRequest(
    new Request("https://valora.pages.dev/dashboard"),
    env,
    async () => {
      called = true;
    },
  );
  assert.equal(r.status, 404);
  assert.equal(called, false);
});
