export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-12 text-center">
      {/* 1. Upper Section: Password Authentication ("Insert password / ask your nerd") */}
      <section
        aria-labelledby="password-heading"
        className="flex flex-col items-center justify-center gap-4"
      >
        <header className="flex flex-col items-center justify-center gap-1">
          <h1 id="password-heading">Insert password</h1>
          <p>Ask your nerd for the 20-character secret</p>
        </header>

        <form
          action="/api/auth/login"
          method="POST"
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
            autoFocus
            required
          />
          <button type="submit">Log in</button>
        </form>

        {/* Failure States & Escalating Feedback (Up to 5 Attempts) */}
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-1"
        >
          {/* Attempts 1–2: Gentle input shake with a warm retry prompt */}
          <p hidden>Almost! Ask your nerd and try again.</p>
          {/* Attempt 3: Playful pleading copy */}
          <p hidden>I&apos;m crying, 3 tries left</p>
          {/* Attempt 4: Playful urgency copy */}
          <p hidden>Why do you hate me, 2 tries left</p>
          {/* Attempt 5: Final warning copy */}
          <p hidden>You&apos;re almost single, 1 try left</p>
        </div>

        {/* Lockout Screen (Cooldown Period after 5 consecutive failed attempts) */}
        <div
          role="alert"
          aria-labelledby="lockout-heading"
          className="flex flex-col items-center justify-center gap-2"
          hidden
        >
          <h2 id="lockout-heading">
            Don&apos;t talk to me for <time dateTime="PT5M0S">05:00</time>...
          </h2>
        </div>
      </section>

      {/* 2. Lower Section: Date-Entry Screen (Story Initiation after authentication) */}
      <section
        aria-labelledby="story-initiation-heading"
        className="flex flex-col items-center justify-center gap-4"
      >
        <header className="flex flex-col items-center justify-center gap-1">
          <h2 id="story-initiation-heading">Ever since...</h2>
          <p>The day our story began...</p>
        </header>

        <form className="flex flex-col items-center justify-center gap-3">
          <fieldset className="flex items-center justify-center gap-2">
            <legend className="sr-only">Our date (DD / MM / YYYY)</legend>
            <input
              type="text"
              name="day"
              placeholder="DD"
              maxLength={2}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Day"
              required
            />
            <span>/</span>
            <input
              type="text"
              name="month"
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Month"
              required
            />
            <span>/</span>
            <input
              type="text"
              name="year"
              placeholder="YYYY"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Year"
              required
            />
          </fieldset>
          <button type="submit">Start our story</button>
        </form>
      </section>
    </main>
  );
}

