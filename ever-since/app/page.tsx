export default function Home() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none overflow-x-hidden">
      {/* Navigation Controls (Edge-aligned circular buttons) */}
      <button
        type="button"
        aria-label="Previous memory"
        className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/80 hover:bg-[#D1D5DB] text-[#4B5563] hover:text-foreground transition-all flex items-center justify-center shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Next memory"
        className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/80 hover:bg-[#D1D5DB] text-[#4B5563] hover:text-foreground transition-all flex items-center justify-center shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      {/* Main Memory Flow & Navigation */}
      <section
        aria-label="Memory timeline"
        className="flex flex-col items-center justify-center w-full max-w-4xl"
      >
        {/* Progress Indicator (Centered dots at the top) */}
        <nav aria-label="Memory progress" className="mb-8 md:mb-12">
          <ol className="flex items-center justify-center gap-2">
            <li
              aria-current="step"
              className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]"
            />
            <li className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
            <li className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
          </ol>
        </nav>

        {/* Central Display: Card Stack on Left + Heading/Text on Right */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-14 w-full">
          {/* Left Column: Stacked Memory Card & Rewind Button */}
          <div className="flex flex-col items-start">
            <div className="relative">
              {/* Stack peek card (behind, shifted to the right) */}
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-1 rounded-[32px] border border-[#E5E7EB] bg-[#EBECEF]/60 -z-10"
              />

              {/* Front active memory card */}
              <article className="w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 rounded-[32px] bg-[#F3F4F6]/80 border border-[#E5E7EB] shadow-xs overflow-hidden flex items-center justify-center">
                {/* Media container / card surface */}
                <figure className="w-full h-full flex items-center justify-center p-4">
                  <div className="w-full h-full rounded-[24px] bg-transparent flex items-center justify-center text-muted text-sm" />
                </figure>
              </article>
            </div>

            {/* Rewind Control (under the bottom-left of the card) */}
            <footer className="mt-3">
              <button
                type="button"
                aria-label="Rewind to beginning"
                className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#6B7280] hover:text-foreground flex items-center justify-center transition-all shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="sr-only">Rewind</span>
              </button>
            </footer>
          </div>

          {/* Right Column: Heading & Text */}
          <div className="flex flex-col items-start text-left justify-start pt-2 md:pt-6 max-w-xs md:max-w-sm">
            <h2 className="text-xl sm:text-2xl md:text-memory-header font-semibold text-foreground leading-tight">
              Heading with
            </h2>
            <p className="text-xl sm:text-2xl md:text-memory-header font-semibold text-foreground leading-tight">
              text there.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}