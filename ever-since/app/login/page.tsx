import LoginForm from './login-form';
import { isSessionAuthenticated } from '@/lib/auth/session';
import { readDb } from '@/lib/storage/db';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const authenticated = await isSessionAuthenticated();
  const db = await readDb().catch(() => null);

  const sealMedia =
    db && db.config.sealMediaId
      ? db.media.find((m) => m.id === db.config.sealMediaId) || null
      : null;

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none">
      <LoginForm
        initialAuthenticated={authenticated}
        sealMedia={sealMedia ? { id: sealMedia.id, filename: sealMedia.filename } : null}
      />
    </main>
  );
}

