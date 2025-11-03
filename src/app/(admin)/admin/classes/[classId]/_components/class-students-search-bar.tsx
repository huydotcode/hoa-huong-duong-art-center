"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function ClassStudentsSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") || "";

  const handleSearch = (formData: FormData) => {
    const query = String(formData.get("q") || "").trim();
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (query) {
      newSearchParams.set("q", query);
    } else {
      newSearchParams.delete("q");
    }
    startTransition(() => {
      router.replace(`${pathname}?${newSearchParams.toString()}`);
    });
  };

  const handleShowAll = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete("q");
    startTransition(() => {
      router.replace(`${pathname}?${newSearchParams.toString()}`);
    });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
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
      {q.length > 0 && (
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
