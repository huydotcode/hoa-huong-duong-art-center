"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export default function ClassesSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState<string>(searchParams.get("q") || "");

  const submit = useCallback(
    (nextQ: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (nextQ) params.set("q", nextQ);
      else params.delete("q");
      startTransition(() => {
        router.replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      });
    },
    [pathname, router, searchParams]
  );

  const hasQuery = (q ?? "").trim().length > 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
      <div className="flex w-full gap-2 sm:w-80" aria-autocomplete="none">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(q.trim());
            }
          }}
          placeholder="Nhập tên lớp học"
          className="flex-1"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          className="whitespace-nowrap"
          disabled={isPending}
          onClick={() => {
            if (q.trim() !== "") submit(q.trim());
          }}
        >
          {isPending ? "Đang tìm..." : "Tìm kiếm"}
        </Button>
      </div>
      {hasQuery && (
        <Button
          type="button"
          variant="outline"
          className="w-full whitespace-nowrap sm:w-auto"
          onClick={() => {
            setQ("");
            submit("");
          }}
          disabled={isPending}
        >
          Hiện tất cả
        </Button>
      )}
    </div>
  );
}
