"use client";

import { useState, useTransition } from "react";
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
import { SUBJECTS } from "@/lib/constants/subjects";
import { cn } from "@/lib/utils";

export default function StudentsSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const q = searchParams.get("q") || "";
  const subject = searchParams.get("subject") || "";
  const activeFilterCount = subject ? 1 : 0;

  const updateSearchParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    updater(params);
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handleSearch = (formData: FormData) => {
    const query = String(formData.get("q") || "").trim();
    updateSearchParams((params) => {
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
    });
  };

  const handleShowAll = () => {
    updateSearchParams((params) => {
      params.delete("q");
      params.delete("subject");
    });
  };

  const handleSubjectSelect = (value: string) => {
    updateSearchParams((params) => {
      if (value) {
        params.set("subject", value);
      } else {
        params.delete("subject");
      }
    });
    setIsFilterOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
      <div className="flex w-full gap-2 sm:w-auto">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
            >
              <Filter className="mr-2 h-4 w-4" />
              Bộ lọc
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 px-1.5" variant="secondary">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Lọc theo môn học</p>
              {subject && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleSubjectSelect("")}
                >
                  <X className="mr-1 h-3 w-3" />
                  Xóa
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {["", ...SUBJECTS].map((item) => (
                <button
                  key={item || "all"}
                  type="button"
                  onClick={() => handleSubjectSelect(item)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition",
                    (item || "") === subject
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 hover:border-primary"
                  )}
                >
                  {item || "Tất cả môn"}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <form
        action={handleSearch}
        className="flex w-full gap-2 sm:w-80"
        autoComplete="off"
      >
        <Input
          name="q"
          defaultValue={q}
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

      {(q.length > 0 || subject) && (
        <Button
          type="button"
          variant="outline"
          className="whitespace-nowrap w-full sm:w-auto"
          onClick={handleShowAll}
          disabled={isPending}
        >
          Hiện tất cả
        </Button>
      )}
    </div>
  );
}
