import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingClassDetail() {
  return (
    <div className="space-y-4 px-3 md:px-0">
      {/* Title */}
      <Skeleton className="h-7 w-56" />

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-10" />
        <Skeleton className="h-8 w-10" />
      </div>

      {/* Tabs skeleton */}
      <div className="inline-flex gap-2 rounded-md bg-muted p-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Content cards/table */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="border rounded-md p-3 space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="border rounded-md p-3 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}
