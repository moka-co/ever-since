'use client';

import { useState, type FormEvent } from 'react';

interface LoginFormProps {
  initialAuthenticated: boolean;
}

export default function LoginForm({ initialAuthenticated }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHasError(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { authenticated: boolean };

      if (response.ok && data.authenticated) {
        setIsAuthenticated(true);
        setHasError(false);
      } else {
        setIsAuthenticated(false);
        setHasError(true);
      }
    } catch {
      setIsAuthenticated(false);
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form
        action="/api/auth/login"
        method="POST"
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-center gap-3"
      >
        <label htmlFor="secret-input" className="sr-only">
          20-character shared secret
        </label>
        <input
          id="secret-input"
          type="password"
          name="password"
          placeholder="Insert password..."
          minLength={20}
          maxLength={20}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting || isAuthenticated}
          autoFocus
          required
        />
        <button type="submit" disabled={isSubmitting || isAuthenticated}>
          {isAuthenticated ? 'Logged in' : isSubmitting ? 'Checking...' : 'Log in'}
        </button>
      </form>

      {/* Generic Login Feedback */}
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center gap-1"
      >
        {isAuthenticated && <p>Password verified! You are logged in.</p>}
        {hasError && <p>Incorrect password, try again!.</p>}
      </div>
    </>
  );
}
