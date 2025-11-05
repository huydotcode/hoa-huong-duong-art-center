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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { SUBJECTS } from "@/lib/constants/subjects";

export default function ClassesSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState<string>(searchParams.get("q") || "");
  const [subject, setSubject] = useState<string>(
    searchParams.get("subject") || ""
  );

  const updateParams = useCallback(
    (newQ: string, newSubject: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (newQ) params.set("q", newQ);
      else params.delete("q");
      if (newSubject) params.set("subject", newSubject);
      else params.delete("subject");
      startTransition(() => {
        router.replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      });
    },
    [pathname, router, searchParams]
  );

  const submit = useCallback(
    (nextQ: string) => {
      updateParams(nextQ, subject);
    },
    [subject, updateParams]
  );

  const handleSubjectChange = (value: string) => {
    const newSubject = value === "all" ? "" : value;
    setSubject(newSubject);
    updateParams(q, newSubject);
  };

  const hasQuery = (q ?? "").trim().length > 0;
  const hasFilter = hasQuery || subject;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:w-auto">
      <Select value={subject || "all"} onValueChange={handleSubjectChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Chọn môn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả môn</SelectItem>
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex w-full gap-2 md:w-80" aria-autocomplete="none">
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

      {hasFilter && (
        <Button
          type="button"
          variant="outline"
          className="w-full whitespace-nowrap md:w-auto"
          onClick={() => {
            setQ("");
            setSubject("");
            updateParams("", "");
          }}
          disabled={isPending}
        >
          Hiện tất cả
        </Button>
      )}
    </div>
  );
}
