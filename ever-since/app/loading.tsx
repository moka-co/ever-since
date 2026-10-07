import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      aria-label="Loading memory timeline"
      className="min-h-screen relative flex flex-col items-center justify-center p-6 md:p-12 select-none overflow-x-hidden"
    >
      {/* Navigation arrows skeleton */}
      <div
        aria-hidden="true"
        className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/60 flex items-center justify-center shadow-xs"
      >
        <Skeleton className="w-4 h-4 rounded-full" />
      </div>

      <div
        aria-hidden="true"
        className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#E5E7EB]/60 flex items-center justify-center shadow-xs"
      >
        <Skeleton className="w-4 h-4 rounded-full" />
      </div>

      <section
        aria-label="Loading memory timeline card"
        className="flex flex-col items-center justify-center w-full max-w-4xl z-0"
      >
        {/* Memory progress dot indicators skeleton */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-2 h-4">
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="w-2 h-2 rounded-full bg-foreground/20" />
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
            <Skeleton className="w-1.5 h-1.5 rounded-full" />
          </div>
        </div>

        {/* Card container + Narrative text */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-14 w-full">
          <div className="flex flex-col items-start">
            <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96">
              {/* Stack peek clue */}
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-1 rounded-[32px] border border-[#E5E7EB] bg-[#EBECEF]/60 -z-10"
              />

              {/* Main memory card */}
              <div className="w-full h-full rounded-[32px] bg-white border border-[#E5E7EB] shadow-xs overflow-hidden p-3 flex items-center justify-center">
                <Skeleton className="w-full h-full rounded-[24px]" />
              </div>
            </div>

            {/* Rewind button skeleton */}
            <div
              aria-hidden="true"
              className="mt-3 w-10 h-10 rounded-full bg-white border border-[#E5E7EB] shadow-xs flex items-center justify-center"
            >
              <Skeleton className="w-4 h-4 rounded-full" />
            </div>
          </div>

          {/* Narrative heading & description skeleton */}
          <div className="flex flex-col items-start text-left justify-start pt-2 md:pt-6 max-w-xs md:max-w-sm w-full gap-3">
            <Skeleton className="h-7 sm:h-8 w-4/5 rounded-xl" />
            <div className="flex flex-col gap-2 w-full mt-1">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-11/12 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
