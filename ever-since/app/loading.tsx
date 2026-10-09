import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      aria-label="Loading memory timeline"
      className="min-h-dvh relative flex flex-col items-center justify-center px-4 py-6 sm:p-6 md:p-12 select-none overflow-x-hidden"
    >
      <section
        aria-label="Loading memory timeline card"
        className="flex flex-col items-center justify-center w-full max-w-lg z-0"
      >
        {/* Memory progress dot indicators skeleton */}
        <div className="mb-4 md:mb-5">
          <div className="flex items-center justify-center gap-2 h-4">
            <div className="w-2 h-2 rounded-full bg-[#F1D6DE]/60" />
            <div className="w-2 h-2 rounded-full bg-[#F1D6DE]/60" />
            <div className="w-6 h-2 rounded-full bg-[#D4537E]/60 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-[#F1D6DE]/60" />
            <div className="w-2 h-2 rounded-full bg-[#F1D6DE]/60" />
          </div>
        </div>

        {/* Card container with stack cue */}
        <div className="relative w-[clamp(260px,calc(100svh-17rem),420px)] max-w-full">
          {/* Stack peek cue */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-3.5 translate-y-2 rounded-[36px] md:rounded-[40px] border border-[#ECDCE3] bg-[#FCF8FA] shadow-[0_10px_35px_rgba(255,150,170,0.18)] -z-10"
          />

          {/* Main memory card */}
          <div className="w-full rounded-[36px] md:rounded-[40px] bg-white border border-[#F1E8EC] shadow-[0_12px_40px_rgba(255,150,170,0.22)] overflow-hidden flex flex-col p-4 sm:p-5">
            {/* Media figure skeleton */}
            <div className="relative w-full aspect-square rounded-[26px] md:rounded-[28px] overflow-hidden bg-[#FAF7F8] flex items-center justify-center shrink-0">
              <Skeleton className="w-full h-full rounded-[26px] md:rounded-[28px]" />
            </div>

            {/* Narrative text skeleton */}
            <div className="flex flex-col items-center text-center justify-center pt-4 pb-1 px-2 w-full gap-2">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
            </div>
          </div>
        </div>

        {/* Compact bottom toolbar skeleton */}
        <div className="flex items-center justify-center gap-4 mt-6 z-10">
          <div className="w-12 h-12 rounded-full bg-white border border-[#F1E8EC] shadow-sm flex items-center justify-center">
            <Skeleton className="w-4 h-4 rounded-full" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white border border-[#F1E8EC] shadow-sm flex items-center justify-center">
            <Skeleton className="w-4 h-4 rounded-full" />
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#F472B6]/40 to-[#FB7185]/40 shadow-sm flex items-center justify-center">
            <Skeleton className="w-4 h-4 rounded-full bg-white/60" />
          </div>
        </div>
      </section>
    </main>
  );
}
