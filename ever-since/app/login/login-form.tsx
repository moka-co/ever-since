'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  initialAuthenticated: boolean;
  sealMedia?: { id: string; filename: string } | null;
}

export default function LoginForm({ initialAuthenticated, sealMedia }: LoginFormProps) {
  const router = useRouter();

  // Authentication State
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date Entry State (View 2)
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [dateError, setDateError] = useState('');

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Password submission (View 1 -> View 2)
  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
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

  // Date input auto-advance handlers
  function handleDayChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '');
    setDay(val);
    setDateError('');
    if (val.length === 2) {
      monthRef.current?.focus();
    }
  }

  function handleMonthChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '');
    setMonth(val);
    setDateError('');
    if (val.length === 2) {
      yearRef.current?.focus();
    }
  }

  function handleYearChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '');
    setYear(val);
    setDateError('');
  }

  // Date submission (View 2 -> Main Memory Flow "/")
  function handleDateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (
      isNaN(d) ||
      d < 1 ||
      d > 31 ||
      isNaN(m) ||
      m < 1 ||
      m > 12 ||
      isNaN(y) ||
      y < 1900 ||
      y > 2100
    ) {
      setDateError('Please enter a valid date');
      return;
    }

    // Transition to main memory flow
    router.push('/');
  }

  /* -------------------------------------------------------------------------- */
  /* VIEW 1: Password Authentication Screen (Mockup 1)                         */
  /* -------------------------------------------------------------------------- */
  if (!isAuthenticated) {
    return (
      <section
        aria-labelledby="password-heading"
        className="w-full max-w-sm rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center"
      >
        <h1
          id="password-heading"
          className="text-xl font-medium text-foreground text-center mb-5"
        >
          Insert the password
        </h1>

        <form
          onSubmit={handlePasswordSubmit}
          className="w-full flex flex-col items-center gap-4"
        >
          <label htmlFor="secret-input" className="sr-only">
            20-character shared secret
          </label>
          <input
            id="secret-input"
            type="password"
            name="password"
            placeholder="ask your nerd"
            minLength={20}
            maxLength={20}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            required
            className="w-full text-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-base font-normal text-foreground placeholder:text-muted/70 focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta transition-colors"
          />

          {hasError && (
            <p role="status" className="text-xs text-rose-500 text-center">
              Incorrect password, try again!
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-5 py-2 text-xs font-medium transition-colors disabled:opacity-50 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            {isSubmitting ? 'Checking...' : 'Log in'}
          </button>
        </form>
      </section>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VIEW 2: Date Entry Screen (Mockup 2 - Shown only after authenticated)     */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-2xl">
      {/* Left Column: Date Input Card */}
      <section
        aria-labelledby="story-initiation-heading"
        className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-[#E5E7EB] bg-white/90 p-8 shadow-xs flex flex-col items-center text-center"
      >
        <h2
          id="story-initiation-heading"
          className="text-2xl font-bold text-foreground text-left w-full mb-6"
        >
          Ever Since...
        </h2>

        <form onSubmit={handleDateSubmit} className="w-full flex flex-col items-center">
          <fieldset className="flex items-center justify-center gap-2 mb-3">
            <legend className="sr-only">Our date (DD / MM / YYYY)</legend>
            <input
              ref={dayRef}
              type="text"
              name="day"
              placeholder="DD"
              maxLength={2}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Day"
              value={day}
              onChange={handleDayChange}
              className="w-14 h-12 text-center rounded-lg border border-[#E5E7EB] bg-white text-base font-medium text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
              autoFocus
              required
            />
            <input
              ref={monthRef}
              type="text"
              name="month"
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Month"
              value={month}
              onChange={handleMonthChange}
              className="w-14 h-12 text-center rounded-lg border border-[#E5E7EB] bg-white text-base font-medium text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
              required
            />
            <input
              ref={yearRef}
              type="text"
              name="year"
              placeholder="YYYY"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Year"
              value={year}
              onChange={handleYearChange}
              className="w-20 h-12 text-center rounded-lg border border-[#E5E7EB] bg-white text-base font-medium text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta"
              required
            />
          </fieldset>

          {/* Space for errors message */}
          <div className="min-h-5 mb-3 flex items-center justify-center">
            <span
              className={`text-xs ${
                dateError ? 'text-rose-500 font-medium' : 'text-muted'
              }`}
            >
              {dateError || 'Space for errors message'}
            </span>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-6 py-2 text-sm font-medium transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Button
          </button>

          {/* Hint: our date */}
          <p className="mt-3 text-xs text-muted">Hint: our date</p>
        </form>
      </section>

      {/* Right Column: Media / Meme Box */}
      <aside
        aria-label="Meme or photo"
        className="w-full max-w-xs sm:max-w-sm h-64 sm:h-72 rounded-2xl bg-[#D1D5DB]/70 border border-[#E5E7EB] flex items-center justify-center overflow-hidden text-center shadow-xs"
      >
        {sealMedia ? (
          sealMedia.filename.toLowerCase().match(/\.(mp4|webm|mov)$/) ? (
            <video
              src={`/api/media/${sealMedia.filename}`}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${sealMedia.filename}`}
              alt="Seal photo or meme"
              className="w-full h-full object-cover"
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/e9d4a14432afcc3f2f8e21cb5608cf14.jpg"
            alt="Default seal photo"
            className="w-full h-full object-cover"
          />
        )}
      </aside>
    </div>
  );
}
