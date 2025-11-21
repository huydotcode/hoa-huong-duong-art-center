"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STUDENT_LEARNING_STATUS_FILTERS } from "@/lib/constants/student-learning-status";
import { cn } from "@/lib/utils";

export default function StudentsSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const q = searchParams.get("q") || "";
  const subject = searchParams.get("subject") || "";
  const learningStatus = searchParams.get("learningStatus") || "";
  const recent = searchParams.get("recent") === "true";
  const tuitionStatus = searchParams.get("tuitionStatus") || "";
  const activeFilterCount = [
    q.trim(),
    subject,
    learningStatus,
    recent ? "1" : "",
    tuitionStatus,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const handleSearch = (value: string) => {
    const query = value.trim();
    updateSearchParams((params) => {
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
    });
  };

  const handleClearFilters = () => {
    setSearchValue("");
    updateSearchParams((params) => {
      params.delete("q");
      params.delete("subject");
      params.delete("learningStatus");
      params.delete("recent");
      params.delete("tuitionStatus");
    });
  };

  const handleRecentToggle = () => {
    updateSearchParams((params) => {
      if (recent) {
        params.delete("recent");
      } else {
        params.set("recent", "true");
      }
    });
  };

  const handleLearningStatusSelect = (value: string) => {
    updateSearchParams((params) => {
      if (value) {
        params.set("learningStatus", value);
      } else {
        params.delete("learningStatus");
      }
    });
    setIsFilterOpen(false);
  };

  const handleTuitionStatusSelect = (value: string) => {
    updateSearchParams((params) => {
      if (value) {
        params.set("tuitionStatus", value);
      } else {
        params.delete("tuitionStatus");
      }
    });
    setIsFilterOpen(false);
  };

  const statusFilterOptions = [
    {
      value: "",
      label: "Tất cả trạng thái",
      description: "Bao gồm mọi học sinh",
    },
    ...STUDENT_LEARNING_STATUS_FILTERS,
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:w-auto">
      <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
            >
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="ml-2 hidden sm:inline">Bộ lọc</span>
              {activeFilterCount > 0 && (
                <Badge
                  className="ml-1 h-5 min-w-5 px-1.5 sm:ml-2"
                  variant="secondary"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 space-y-5 max-h-[60vh] overflow-y-auto"
            align="end"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Trạng thái học</p>
                {learningStatus && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleLearningStatusSelect("")}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Xóa
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {statusFilterOptions.map((option) => (
                  <button
                    key={option.value || "all-status"}
                    type="button"
                    onClick={() => handleLearningStatusSelect(option.value)}
                    className={cn(
                      "w-full rounded border px-3 py-2 text-left text-sm transition",
                      option.value === learningStatus
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 hover:border-primary"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Trạng thái học phí</p>
                {tuitionStatus && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleTuitionStatusSelect("")}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Xóa
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {[
                  {
                    value: "",
                    label: "Tất cả trạng thái",
                    description: "Bao gồm mọi trạng thái học phí",
                  },
                  {
                    value: "paid_or_partial",
                    label: "Đã đóng (gồm một phần)",
                    description: "Đã đóng hoặc đóng một phần học phí",
                  },
                  {
                    value: "unpaid_or_not_created",
                    label: "Chưa đóng",
                    description: "Chưa đóng hoặc chưa tạo học phí",
                  },
                ].map((option) => (
                  <button
                    key={option.value || "all-tuition"}
                    type="button"
                    onClick={() => handleTuitionStatusSelect(option.value)}
                    className={cn(
                      "w-full rounded border px-3 py-2 text-left text-sm transition",
                      option.value === tuitionStatus
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 hover:border-primary"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Khung thời gian</p>
                {recent && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleRecentToggle}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Xóa
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleRecentToggle}
                  className={cn(
                    "w-full rounded border px-3 py-2 text-left text-sm transition",
                    recent
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 hover:border-primary"
                  )}
                >
                  <p className="font-medium">Học sinh mới (30 ngày)</p>
                  <p className="text-xs text-muted-foreground">
                    Chỉ hiển thị học sinh có ngày ghi danh trong 30 ngày gần
                    nhất
                  </p>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={handleClearFilters}
            disabled={isPending}
          >
            Xóa lọc
          </Button>
        )}
      </div>

      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          handleSearch(searchValue);
        }}
        className="order-1 flex w-full gap-2 sm:order-1 sm:w-80"
        autoComplete="off"
      >
        <Input
          name="q"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Tìm học sinh..."
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="secondary"
          className="whitespace-nowrap"
          disabled={isPending}
          aria-label="Tìm kiếm học sinh"
        >
          Tìm kiếm
        </Button>
      </form>
    </div>
  );
}
