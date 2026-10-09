import LoginForm from './login-form';
import { isSessionAuthenticated } from '@/lib/auth/session';
import { readDb } from '@/lib/storage/db';
import { reconcileMediaLibrary } from '@/lib/media/sync';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  await reconcileMediaLibrary().catch(() => {});
  const authenticated = await isSessionAuthenticated();
  const db = await readDb().catch(() => null);

  const sealMedia =
    db && db.config.sealMediaId
      ? db.media.find((m) => m.id === db.config.sealMediaId) || null
      : null;

  return (
    <main className="min-h-dvh relative flex flex-col items-center justify-center px-4 py-6 sm:p-6 md:p-12 select-none overflow-x-hidden">
      <LoginForm
        initialAuthenticated={authenticated}
        sealMedia={sealMedia ? { id: sealMedia.id, filename: sealMedia.filename } : null}
      />
    </main>
  );
}

