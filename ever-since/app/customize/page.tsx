import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isSessionAuthenticated } from '@/lib/auth/session';

export default async function CustomizePage() {
  const authenticated = await isSessionAuthenticated();

  if (!authenticated) {
    redirect('/login');
  }
  return (
    <main className="min-h-screen w-full py-10 px-4 md:px-8 flex justify-center items-start select-none">
      {/* Mobile Notice (< 1024px) */}
      <section
        aria-label="Desktop required notice"
        className="flex lg:hidden flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-sm my-auto"
      >
        <h1 className="text-xl font-bold text-foreground mb-2">Desktop Only</h1>
        <p className="text-sm text-muted mb-4">
          Please open /customize on a desktop device (1024px or wider).
        </p>
        <Link
          href="/"
          className="text-xs font-medium text-cta hover:text-cta-hover transition-colors"
        >
          ← Return to Main Flow
        </Link>
      </section>

      {/* Desktop Admin Dashboard (>= 1024px) - Single Long Vertical Card */}
      <div className="hidden lg:flex flex-col w-full max-w-3xl rounded-[28px] border border-[#E5E7EB] bg-white p-10 md:p-12 shadow-md gap-10">
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customize EverSince</h1>
            <p className="text-sm text-muted mt-1">
              Configure your anniversary date, media assets, and timeline memories.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-foreground hover:text-cta bg-gray-50 hover:bg-gray-100 border border-[#E5E7EB] px-4 py-2 rounded-lg transition-colors shadow-2xs"
          >
            ← View Main Flow
          </Link>
        </header>

        {/* 1. Anniversary Date Config */}
        <section
          aria-labelledby="config-heading"
          className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
        >
          <div className="flex items-center justify-between">
            <h2 id="config-heading" className="text-lg font-semibold text-foreground">
              Anniversary Date
            </h2>
            <span className="text-xs text-muted">The kickoff date for your story</span>
          </div>
          <form className="flex items-center gap-3">
            <input
              type="date"
              name="anniversaryDate"
              defaultValue="2025-09-30"
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-5 py-2 text-sm font-medium transition-colors shadow-xs"
            >
              Save Date
            </button>
          </form>
        </section>

        {/* 2. Media Management (Max 20 files, 10MB limit) */}
        <section
          aria-labelledby="media-heading"
          className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="media-heading" className="text-lg font-semibold text-foreground">
                Media Library
              </h2>
              <p className="text-xs text-muted mt-0.5">Images and videos for memories (max 10MB each)</p>
            </div>
            <span className="text-xs font-medium text-foreground bg-gray-100 px-3 py-1 rounded-full border border-[#E5E7EB]">
              1 / 20 media files used
            </span>
          </div>

          <form className="flex items-center gap-3">
            <input
              type="file"
              name="file"
              accept="image/*,video/*"
              className="text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[#E5E7EB] file:text-xs file:font-medium file:bg-gray-50 file:text-foreground hover:file:bg-gray-100 cursor-pointer"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#1E1B24] hover:bg-[#2D2837] text-white px-4 py-2 text-xs font-medium transition-colors shadow-xs"
            >
              Upload Media
            </button>
          </form>

          {/* Mock Media List */}
          <ul className="flex flex-col gap-2 mt-2">
            <li className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-medium text-foreground">
                  IMG
                </span>
                <span className="text-sm font-medium text-foreground">1.jpg</span>
              </div>
              <button
                type="button"
                className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1 rounded-md hover:bg-rose-50 transition-colors"
              >
                Delete
              </button>
            </li>
          </ul>
        </section>

        {/* 3. Create / Edit Memory Form */}
        <section
          aria-labelledby="memory-form-heading"
          className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]"
        >
          <div>
            <h2 id="memory-form-heading" className="text-lg font-semibold text-foreground">
              Add / Edit Memory
            </h2>
            <p className="text-xs text-muted mt-0.5">Author a new memory card for your timeline</p>
          </div>

          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="memory-heading" className="text-sm font-medium text-foreground">
                Header
              </label>
              <input
                id="memory-heading"
                type="text"
                name="heading"
                placeholder="Ever since we met..."
                maxLength={100}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="memory-text" className="text-sm font-medium text-foreground">
                Text
              </label>
              <input
                id="memory-text"
                type="text"
                name="text"
                placeholder="Memory description..."
                maxLength={100}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="memory-media" className="text-sm font-medium text-foreground">
                  Media
                </label>
                <select
                  id="memory-media"
                  name="mediaId"
                  defaultValue=""
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs"
                >
                  <option value="">None</option>
                  <option value="1">1.jpg</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="memory-button" className="text-sm font-medium text-foreground">
                  Fun Button
                </label>
                <select
                  id="memory-button"
                  name="buttonType"
                  defaultValue=""
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-foreground focus:border-cta focus:outline-none focus:ring-1 focus:ring-cta shadow-2xs"
                >
                  <option value="">None</option>
                  <option value="seal">Pixel Seal</option>
                  <option value="sound">Sound Effect (Ye-he)</option>
                  <option value="yes-no">Dodging Yes/No</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-lg bg-cta hover:bg-cta-hover text-white px-6 py-2.5 text-sm font-medium transition-colors shadow-xs"
              >
                Save Memory
              </button>
            </div>
          </form>
        </section>

        {/* 4. Memories List & Reordering */}
        <section
          aria-labelledby="memories-list-heading"
          className="flex flex-col gap-4"
        >
          <div>
            <h2 id="memories-list-heading" className="text-lg font-semibold text-foreground">
              Memories Timeline
            </h2>
            <p className="text-xs text-muted mt-0.5">Reorder or modify cards in the story</p>
          </div>

          <ol className="flex flex-col gap-2.5">
            <li className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-[#E5E7EB] bg-gray-50/60 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="text-muted cursor-grab select-none">::</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move memory up"
                    className="w-7 h-7 rounded-md border border-[#E5E7EB] bg-white hover:bg-gray-100 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    aria-label="Move memory down"
                    className="w-7 h-7 rounded-md border border-[#E5E7EB] bg-white hover:bg-gray-100 flex items-center justify-center text-xs font-semibold text-foreground transition-colors shadow-2xs"
                  >
                    &darr;
                  </button>
                </div>
                <strong className="text-sm font-semibold text-foreground">
                  Ever since we met...
                </strong>
                <span className="text-xs text-muted">(1.jpg)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-foreground hover:text-cta font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-rose-50 transition-colors shadow-2xs"
                >
                  Delete
                </button>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
