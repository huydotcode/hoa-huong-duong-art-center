"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { formatVND } from "@/lib/utils";

interface ExpensesFilterProps {
  total: number;
  onAddClick: () => void;
}

export default function ExpensesFilter({
  total,
  onAddClick,
}: ExpensesFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const queryParam = searchParams.get("q") || "";

  const now = new Date();
  const defaultMonth = monthParam
    ? parseInt(monthParam, 10)
    : now.getMonth() + 1;
  const defaultYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  const [month, setMonth] = useState<string>(String(defaultMonth));
  const [year, setYear] = useState<string>(String(defaultYear));
  const [query, setQuery] = useState<string>(queryParam);

  const updateParams = useCallback(
    (newMonth: string, newYear: string, newQuery: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (newMonth) params.set("month", newMonth);
      else params.delete("month");
      if (newYear) params.set("year", newYear);
      else params.delete("year");
      if (newQuery.trim()) params.set("q", newQuery.trim());
      else params.delete("q");

      startTransition(() => {
        router.replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      });
    },
    [pathname, router, searchParams]
  );

  const handleMonthChange = (value: string) => {
    setMonth(value);
    updateParams(value, year, query);
  };

  const handleYearChange = (value: string) => {
    setYear(value);
    updateParams(month, value, query);
  };

  const handleSearch = () => {
    updateParams(month, year, query);
  };

  const handleClear = () => {
    const now = new Date();
    const defaultMonth = String(now.getMonth() + 1);
    const defaultYear = String(now.getFullYear());
    setMonth(defaultMonth);
    setYear(defaultYear);
    setQuery("");
    updateParams(defaultMonth, defaultYear, "");
  };

  // Generate year options (current year - 2 to current year + 2)
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const hasFilter =
    month !== String(now.getMonth() + 1) ||
    year !== String(now.getFullYear()) ||
    query.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  Tháng {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex w-full gap-2 md:w-80">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Tìm kiếm theo lý do..."
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={isPending}
              onClick={handleSearch}
            >
              {isPending ? "Đang tìm..." : "Tìm kiếm"}
            </Button>
          </div>

          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              className="w-full whitespace-nowrap md:w-auto"
              onClick={handleClear}
              disabled={isPending}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Button onClick={onAddClick} className="w-full md:w-auto">
          Thêm chi phí
        </Button>
      </div>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Tổng chi phí tháng {month}/{year}
              </p>
              <p className="text-2xl font-bold">{formatVND(total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
