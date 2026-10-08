import { useTempDb, TestHarness } from './helpers';
import { NextRequest } from 'next/server';
import { sealData } from 'iron-session';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

async function main() {
  const harness = new TestHarness();
  const temp = await useTempDb('12345678901234567890');
  const testBannedIpPath = join(temp.dir, 'banned_ip.log');
  process.env.BANNED_IP_PATH = testBannedIpPath;

  try {
    const { proxy } = await import('../proxy');
    const { readDb } = await import('../lib/storage/db');
    const { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } = await import('../lib/auth/session');

    console.log('--- Starting Proxy Verification ---');

    // 1. Verify Public Auth routes (no cookie, unauthenticated)
    const publicRoutes = ['/api/auth/login', '/api/auth/logout'];
    for (const path of publicRoutes) {
      const req = new NextRequest(new URL(`http://localhost:3000${path}`));
      const res = await proxy(req);
      harness.assert(
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
      const res = await proxy(req);
      harness.assert(
        res.status === 401,
        `Protected API ${path} returns 401 without auth (got ${res.status})`
      );
      const body = await res.json();
      harness.assert(
        body.error === 'not authenticated',
        `Protected API ${path} returns { error: 'not authenticated' } (got ${JSON.stringify(body)})`
      );
    }

    // 3. Verify Page routes without session (must redirect to /login)
    const pageRoutes = ['/', '/customize', '/customize/photos'];
    for (const path of pageRoutes) {
      const req = new NextRequest(new URL(`http://localhost:3000${path}`));
      const res = await proxy(req);
      harness.assert(
        res.status === 307,
        `Page route ${path} returns 307 redirect without auth (got ${res.status})`
      );
      const location = res.headers.get('location');
      harness.assert(
        location?.endsWith('/login') === true,
        `Page route ${path} redirects to /login (location: ${location})`
      );
    }

    // 4. Verify Protected routes WITH valid authenticated session cookie
    const db = await readDb();
    const derivedPassword = createHash('sha256').update(db.secret.value).digest('hex');
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
      const res = await proxy(req);
      harness.assert(
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
    const expiredApiRes = await proxy(expiredApiReq);
    harness.assert(
      expiredApiRes.status === 401,
      `Expired session on /api/config returns 401 (got ${expiredApiRes.status})`
    );
    const expiredApiBody = await expiredApiRes.json();
    harness.assert(
      expiredApiBody.error === 'not authenticated',
      `Expired session on /api/config returns { error: 'not authenticated' }`
    );

    const expiredPageReq = new NextRequest(new URL('http://localhost:3000/'), {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${expiredCookie}`,
      },
    });
    const expiredPageRes = await proxy(expiredPageReq);
    harness.assert(
      expiredPageRes.status === 307 && expiredPageRes.headers.get('location')?.endsWith('/login') === true,
      `Expired session on / redirects to /login`
    );

    // 6. Verify banned IP is rejected with 403 Forbidden
    const { writeFile } = await import('node:fs/promises');
    await writeFile(testBannedIpPath, '192.168.1.99\n', 'utf8');

    const bannedReq = new NextRequest(new URL('http://localhost:3000/api/config'), {
      headers: {
        'x-forwarded-for': '192.168.1.99',
      },
    });
    const bannedRes = await proxy(bannedReq);
    harness.assert(
      bannedRes.status === 403,
      `Banned IP on /api/config returns 403 (got ${bannedRes.status})`
    );
    const bannedBody = await bannedRes.json();
    harness.assert(
      bannedBody.error === 'IP is locked out',
      `Banned IP returns { error: 'IP is locked out' }`
    );

    harness.finish('Proxy Verification');
  } finally {
    delete process.env.BANNED_IP_PATH;
    await temp.cleanup();
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
