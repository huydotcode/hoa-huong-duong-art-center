"use client";

import { Button } from "@/components/ui/button";
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
import { formatCurrencyVN } from "@/lib/utils";
import { Download } from "lucide-react";

interface SalaryFilterProps {
  total: number;
  month: number;
  year: number;
  onExportClick: () => void;
}

export default function SalaryFilter({
  total,
  month,
  year,
  onExportClick,
}: SalaryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const defaultMonth = monthParam
    ? parseInt(monthParam, 10)
    : now.getMonth() + 1;
  const defaultYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(defaultMonth)
  );
  const [selectedYear, setSelectedYear] = useState<string>(String(defaultYear));

  const updateParams = useCallback(
    (newMonth: string, newYear: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (newMonth) params.set("month", newMonth);
      else params.delete("month");
      if (newYear) params.set("year", newYear);
      else params.delete("year");

      startTransition(() => {
        router.replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      });
    },
    [pathname, router, searchParams]
  );

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    updateParams(value, selectedYear);
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    updateParams(selectedMonth, value);
  };

  // Generate year options (current year - 2 to current year + 2)
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select
            value={selectedMonth}
            onValueChange={handleMonthChange}
            disabled={isPending}
          >
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

          <Select
            value={selectedYear}
            onValueChange={handleYearChange}
            disabled={isPending}
          >
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

          <Button
            onClick={onExportClick}
            variant="outline"
            className="w-full md:w-auto"
            disabled={isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <Card className="bg-secondary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Tổng lương tháng {month}/{year}
              </p>
              <p className="text-2xl font-bold">{formatCurrencyVN(total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
