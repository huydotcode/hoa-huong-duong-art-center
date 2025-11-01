export function TeachersListSkeleton() {
  return (
    <>
      {/* Mobile skeleton: card list */}
      <div className="grid gap-2 px-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="mb-2 flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton: table rows */}
      <div className="hidden md:block">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 items-center gap-4 px-4 py-3"
            >
              <div className="col-span-1 h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="col-span-1 h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="col-span-1 ml-auto h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="col-span-2 h-4 w-64 rounded bg-muted animate-pulse" />
              <div className="col-span-1 ml-auto flex items-center gap-2">
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                <div className="h-6 w-8 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
