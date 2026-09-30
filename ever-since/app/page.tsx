export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center">
      {/* Main Memory Flow & Navigation */}
      <section
        aria-label="Memory timeline"
        className="flex flex-col items-center justify-center gap-4"
      >
        {/* Progress Indicator (Dynamic sliding dots) */}
        <nav aria-label="Memory progress">
          <ol className="flex items-center justify-center gap-2">
            <li aria-current="step">.</li>
            <li>.</li>
            <li>.</li>
          </ol>
        </nav>

        <div className="flex items-center justify-center gap-6">
          {/* Previous Memory Control */}
          <button type="button" aria-label="Previous memory">
            &lt;
          </button>

          {/* Single Active Memory Card */}
          <article className="flex flex-col items-center justify-center gap-2">
            <header>
              <h2>This is heading</h2>
            </header>

            <figure>
              {/* Image or Video (mutually exclusive) */}
              <img src="/api/media/sample.jpg" alt="" />
            </figure>

            <p>Photo/Video</p>

            {/* Interactive "Fun" Button Area */}
            <div>
              <button type="button">Button</button>
            </div>
          </article>

          {/* Next Memory Control */}
          <button type="button" aria-label="Next memory">
            &gt;
          </button>
        </div>

        {/* Rewind Control (1.5s press-and-hold in final behavior) */}
        <footer>
          <button type="button">Rewind</button>
        </footer>
      </section>
    </main>
  );
}