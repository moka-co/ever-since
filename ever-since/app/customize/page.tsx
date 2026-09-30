export default function CustomizePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Mobile Notice (< 1024px) */}
      <section
        aria-label="Desktop required notice"
        className="flex lg:hidden flex-col items-center justify-center text-center"
      >
        <h1>Desktop Only</h1>
        <p>Please open /customize on a desktop device (1024px or wider).</p>
      </section>

      {/* Desktop Admin Dashboard (>= 1024px) */}
      <div className="hidden lg:flex flex-col w-full max-w-4xl gap-8">
        <header className="flex items-center justify-between">
          <h1>Customize EverSince</h1>
          <a href="/">View Main Flow</a>
        </header>

        {/* 1. Anniversary Date Config */}
        <section
          aria-labelledby="config-heading"
          className="flex items-center justify-between gap-4"
        >
          <h2 id="config-heading">Anniversary Date</h2>
          <form className="flex items-center gap-2">
            <input type="date" name="anniversaryDate" defaultValue="2025-09-30" />
            <button type="submit">Save Date</button>
          </form>
        </section>

        {/* 2. Media Management (Max 20 files, 10MB limit) */}
        <section
          aria-labelledby="media-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 id="media-heading">Media Library</h2>
            <span>1 / 20 media files used</span>
          </div>

          <form className="flex items-center gap-4">
            <input type="file" name="file" accept="image/*,video/*" />
            <button type="submit">Upload Media</button>
          </form>

          {/* Mock Media List */}
          <ul className="flex items-center gap-4">
            <li className="flex items-center gap-2">
              <span>1.jpg</span>
              <button type="button">Delete</button>
            </li>
          </ul>
        </section>

        {/* 3. Create / Edit Memory Form */}
        <section
          aria-labelledby="memory-form-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="memory-form-heading">Add / Edit Memory</h2>
          <form className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="memory-heading">Header:</label>
              <input
                id="memory-heading"
                type="text"
                name="heading"
                placeholder="Ever since we met..."
                maxLength={100}
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="memory-text">Text:</label>
              <input
                id="memory-text"
                type="text"
                name="text"
                placeholder="Memory description..."
                maxLength={100}
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="memory-media">Media:</label>
              <select id="memory-media" name="mediaId" defaultValue="">
                <option value="">None</option>
                <option value="1">1.jpg</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="memory-button">Fun Button:</label>
              <select id="memory-button" name="buttonType" defaultValue="">
                <option value="">None</option>
                <option value="seal">Pixel Seal</option>
                <option value="sound">Sound Effect (Ye-he)</option>
                <option value="yes-no">Dodging Yes/No</option>
              </select>
            </div>

            <div>
              <button type="submit">Save Memory</button>
            </div>
          </form>
        </section>

        {/* 4. Memories List & Reordering */}
        <section
          aria-labelledby="memories-list-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="memories-list-heading">Memories Timeline</h2>
          <ol className="flex flex-col gap-2">
            <li className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">::</span>
                <button type="button" aria-label="Move memory up">
                  &uarr;
                </button>
                <button type="button" aria-label="Move memory down">
                  &darr;
                </button>
                <strong>Ever since we met...</strong>
                <span>(1.jpg)</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button">Edit</button>
                <button type="button">Delete</button>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
