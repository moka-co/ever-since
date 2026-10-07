import { Skeleton } from "@/components/ui/skeleton";

export default function CustomizeLoading() {
  return (
    <main
      aria-label="Loading admin dashboard"
      className="min-h-screen w-full py-10 px-4 md:px-8 flex justify-center items-start select-none"
    >
      {/* Mobile Notice Skeleton (< 1024px) */}
      <section
        aria-label="Desktop notice loading"
        className="flex lg:hidden flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-sm my-auto w-full"
      >
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-56 mb-4" />
        <Skeleton className="h-4 w-36 rounded-md" />
      </section>

      {/* Desktop Dashboard Skeleton (>= 1024px) */}
      <div className="hidden lg:flex flex-col w-full max-w-3xl rounded-[28px] border border-[#E5E7EB] bg-white p-10 md:p-12 shadow-md gap-10">
        {/* Header Skeleton */}
        <header className="flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-60" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </header>

        {/* 1. Anniversary Date Config Skeleton */}
        <div className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* 2. Seal Photo Config Skeleton */}
        <div className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* 3. Media Management Skeleton */}
        <div className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-52 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-gray-50/50">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] bg-gray-50/50">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-14 rounded-md" />
            </div>
          </div>
        </div>

        {/* 3. Memory Authoring Skeleton */}
        <div className="flex flex-col gap-4 pb-8 border-b border-[#E5E7EB]">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
          <div className="pt-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* 4. Memories Timeline List Skeleton */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-[#E5E7EB] bg-gray-50/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="w-4 h-4 rounded-sm shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <Skeleton className="w-7 h-7 rounded-md" />
                    <Skeleton className="w-7 h-7 rounded-md" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-7 w-12 rounded-lg" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
