import LoginForm from './login-form';
import { isSessionAuthenticated } from '@/lib/auth/session';

export default async function LoginPage() {
  const authenticated = await isSessionAuthenticated();

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none">
      <LoginForm initialAuthenticated={authenticated} />
    </main>
  );
}

