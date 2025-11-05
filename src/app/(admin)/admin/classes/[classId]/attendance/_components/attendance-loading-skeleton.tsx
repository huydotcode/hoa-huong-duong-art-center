"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AttendanceLoadingSkeleton() {
  return (
    <div className="px-0">
      <Card className="p-3 md:p-4">
        {/* Toolbar skeleton */}
        <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
          </div>

          {/* Mobile: session select + filter icon */}
          <div className="flex items-center gap-2 md:hidden">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-9 w-9" />
          </div>

          {/* Desktop: session select + object filter + bulk buttons */}
          <div className="hidden md:flex items-center gap-2 md:ml-auto">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-[180px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>

        {/* Mobile cards skeleton */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Skeleton className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop table skeleton */}
        <div className="hidden md:block overflow-x-auto">
          <div className="border rounded-md">
            <div className="border-b">
              <div className="grid grid-cols-[1fr_1fr_120px_120px_120px] gap-4 p-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 mx-auto" />
                <Skeleton className="h-5 w-16 mx-auto" />
                <Skeleton className="h-5 w-16 mx-auto" />
              </div>
            </div>
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_120px_120px_120px] gap-4 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <div className="flex justify-center">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
