import { Skeleton } from "@/components/ui/skeleton";

export function ClassesListSkeleton() {
  return (
    <div className="p-3">
      <div className="hidden md:block">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-8 gap-2">
              {[...Array(8)].map((__, j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="md:hidden grid gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border p-3 rounded-md space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-4 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
