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
  /* VIEW 1: Password Authentication Screen                                     */
  /* -------------------------------------------------------------------------- */
  if (!isAuthenticated) {
    return (
      <section
        aria-labelledby="password-heading"
        className="w-80 sm:w-96 max-w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] p-8 sm:p-10 flex flex-col items-center justify-center text-center select-none"
      >
        <h1
          id="password-heading"
          className="text-2xl font-bold text-foreground text-center w-full mb-1"
        >
          Insert the password
        </h1>
        <p className="text-xs text-muted mb-6">
          Ask your nerd for the secret key
        </p>

        <form
          onSubmit={handlePasswordSubmit}
          className="w-full flex flex-col items-center"
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (hasError) setHasError(false);
            }}
            disabled={isSubmitting}
            autoFocus
            required
            className="w-full text-center rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8] px-4 py-3 text-base font-medium text-foreground placeholder:text-muted/60 focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs transition-all"
          />

          {/* Reserved space for error message to avoid layout jump */}
          <div className="min-h-5 my-3 flex items-center justify-center">
            {hasError && (
              <p role="status" className="text-xs text-rose-500 font-medium text-center">
                Incorrect password, try again!
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white px-7 py-2.5 text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(244,114,182,0.4)] hover:shadow-[0_6px_20px_rgba(244,114,182,0.55)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:hover:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            {isSubmitting ? 'Checking...' : 'Log in'}
          </button>
        </form>
      </section>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* VIEW 2: Date Entry Screen (Shown only after authenticated)               */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-4xl">
      {/* Left Column: Date Input Card */}
      <section
        aria-labelledby="story-initiation-heading"
        className="w-80 sm:w-96 max-w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] p-7 sm:p-8 flex flex-col items-center text-center select-none"
      >
        <h2
          id="story-initiation-heading"
          className="text-2xl font-bold text-foreground text-center w-full mb-6"
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
              className="w-14 h-12 text-center rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8] text-base font-semibold text-foreground focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta transition-colors"
              autoFocus
              required
            />
            <span className="text-muted/60 font-light text-lg">/</span>
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
              className="w-14 h-12 text-center rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8] text-base font-semibold text-foreground focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta transition-colors"
              required
            />
            <span className="text-muted/60 font-light text-lg">/</span>
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
              className="w-20 h-12 text-center rounded-2xl border border-[#F1E8EC] bg-[#FAF7F8] text-base font-semibold text-foreground focus:border-cta focus:bg-white focus:outline-none focus:ring-1 focus:ring-cta transition-colors"
              required
            />
          </fieldset>

          {/* Space for error message */}
          <div className="min-h-5 mb-3 flex items-center justify-center">
            <span
              className={`text-xs ${
                dateError ? 'text-rose-500 font-medium' : 'text-muted'
              }`}
            >
              {dateError || 'Space for errors message'}
            </span>
          </div>

          {/* Gradient Primary Action Button matching main flow style */}
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-[#F472B6] to-[#FB7185] hover:from-[#EC4899] hover:to-[#F43F5E] text-white px-7 py-2.5 text-sm font-semibold transition-all shadow-[0_4px_16px_rgba(244,114,182,0.4)] hover:shadow-[0_6px_20px_rgba(244,114,182,0.55)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            Start Story
          </button>

          {/* Hint: our date */}
          <p className="mt-3 text-xs text-muted">Hint: our date</p>
        </form>
      </section>

      {/* Right Column: Media / Seal Card */}
      <aside
        aria-label="Meme or photo"
        className="w-80 sm:w-96 max-w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] p-4 sm:p-5 flex flex-col items-center justify-center text-center overflow-hidden"
      >
        <div className="relative w-full aspect-square rounded-[26px] md:rounded-[28px] overflow-hidden bg-[#FAF7F8] flex items-center justify-center">
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
        </div>
      </aside>
    </div>
  );
}
