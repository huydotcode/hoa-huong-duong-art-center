import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="">
      {/* Header skeleton */}
      <CardHeader className="px-3">
        <Skeleton className="h-7 w-40" />
      </CardHeader>

      {/* Filter skeleton */}
      <div className="space-y-4 px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Skeleton className="h-10 w-full md:w-[140px]" />
            <Skeleton className="h-10 w-full md:w-[120px]" />
            <Skeleton className="h-10 w-full md:w-[140px]" />
          </div>
        </div>

        {/* Total salary card skeleton */}
        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Card view skeleton */}
      <div className="grid gap-4 px-4 py-4 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-between text-sm">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex justify-between text-sm">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: Table view skeleton */}
      <Card className="hidden md:block">
        <CardContent className="hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-28" />
                </TableHead>
                <TableHead className="text-center">
                  <Skeleton className="h-4 w-24 mx-auto" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="h-4 w-24 ml-auto" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="h-4 w-24 ml-auto" />
                </TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-28 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
