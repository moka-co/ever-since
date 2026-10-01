import Module from 'node:module';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const origRequire = (Module.prototype as any).require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module.prototype as any).require = function (this: unknown, id: string, ...args: unknown[]) {
  if (id === 'server-only') {
    return {};
  }
  return origRequire.apply(this, [id, ...args]);
};

async function main() {
  const { middleware } = await import('../middleware');
  const { NextRequest } = await import('next/server');
  const { sealData } = await import('iron-session');
  const { createHash } = await import('node:crypto');
  const { dbClient } = await import('../lib/storage/db');
  const { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } = await import('../lib/auth/session');

  console.log('--- Starting Middleware Verification ---');
  let failures = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`FAIL: ${msg}`);
      failures++;
    } else {
      console.log(`PASS: ${msg}`);
    }
  }

  // 1. Verify Public API routes (no cookie, unauthenticated)
  const publicRoutes = ['/api/auth/login', '/api/auth/session', '/api/auth/logout'];
  for (const path of publicRoutes) {
    const req = new NextRequest(new URL(`http://localhost:3000${path}`));
    const res = await middleware(req);
    assert(
      res.status === 200 && !res.headers.get('location'),
      `Public route ${path} allows request through (status 200, no redirect)`
    );
  }

  // 2. Verify Protected API routes without session (must return 401 { error: 'not authenticated' })
  const protectedApiRoutes = [
    '/api/config',
    '/api/memories',
    '/api/memories/test-id-123',
    '/api/memories/reorder',
    '/api/media',
    '/api/media/test-media-123',
  ];

  for (const path of protectedApiRoutes) {
    const req = new NextRequest(new URL(`http://localhost:3000${path}`));
    const res = await middleware(req);
    assert(
      res.status === 401,
      `Protected API ${path} returns 401 without auth (got ${res.status})`
    );
    const body = await res.json();
    assert(
      body.error === 'not authenticated',
      `Protected API ${path} returns { error: 'not authenticated' } (got ${JSON.stringify(body)})`
    );
  }

  // 3. Verify Page routes without session (must redirect to /login)
  const pageRoutes = ['/', '/customize', '/customize/photos'];
  for (const path of pageRoutes) {
    const req = new NextRequest(new URL(`http://localhost:3000${path}`));
    const res = await middleware(req);
    assert(
      res.status === 307,
      `Page route ${path} returns 307 redirect without auth (got ${res.status})`
    );
    const location = res.headers.get('location');
    assert(
      location?.endsWith('/login') === true,
      `Page route ${path} redirects to /login (location: ${location})`
    );
  }

  // 4. Verify Protected routes WITH valid authenticated session cookie
  const secret = await dbClient.getSecret();
  const derivedPassword = createHash('sha256').update(secret).digest('hex');
  const validCookie = await sealData(
    { authenticated: true, loginAt: Date.now() },
    { password: derivedPassword, ttl: SESSION_TTL_SECONDS }
  );

  for (const path of [...protectedApiRoutes, ...pageRoutes]) {
    const req = new NextRequest(new URL(`http://localhost:3000${path}`), {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${validCookie}`,
      },
    });
    const res = await middleware(req);
    assert(
      res.status === 200 && !res.headers.get('location'),
      `Authenticated request to ${path} allows request through (status 200)`
    );
  }

  // 5. Verify Protected routes with EXPIRED session cookie
  const expiredCookie = await sealData(
    { authenticated: true, loginAt: Date.now() - (SESSION_TTL_SECONDS + 100) * 1000 },
    { password: derivedPassword, ttl: SESSION_TTL_SECONDS }
  );

  const expiredApiReq = new NextRequest(new URL('http://localhost:3000/api/config'), {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${expiredCookie}`,
    },
  });
  const expiredApiRes = await middleware(expiredApiReq);
  assert(
    expiredApiRes.status === 401,
    `Expired session on /api/config returns 401 (got ${expiredApiRes.status})`
  );
  const expiredApiBody = await expiredApiRes.json();
  assert(
    expiredApiBody.error === 'not authenticated',
    `Expired session on /api/config returns { error: 'not authenticated' }`
  );

  const expiredPageReq = new NextRequest(new URL('http://localhost:3000/'), {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${expiredCookie}`,
    },
  });
  const expiredPageRes = await middleware(expiredPageReq);
  assert(
    expiredPageRes.status === 307 && expiredPageRes.headers.get('location')?.endsWith('/login') === true,
    `Expired session on / redirects to /login`
  );

  console.log(`\n--- Verification Finished: ${failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`} ---`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
