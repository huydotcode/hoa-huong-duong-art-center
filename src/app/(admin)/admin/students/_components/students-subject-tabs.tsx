"use client";

import { Button } from "@/components/ui";
import { SUBJECTS } from "@/lib/constants/subjects";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function StudentsSubjectTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeSubject = searchParams.get("subject") || "all";

  const tabs = [
    { label: "Tất cả môn", value: "all" },
    ...SUBJECTS.map((subject) => ({
      label: subject,
      value: subject,
    })),
  ];

  const handleTabChange = (value: string) => {
    if (isPending) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("subject");
    } else {
      params.set("subject", value);
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  return (
    <div className="flex flex-col gap-2 max-w-full overflow-x-auto">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const isActive = activeSubject === tab.value;
            return (
              <Button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                disabled={isPending}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-muted-foreground/30 bg-muted/50 text-muted-foreground hover:border-primary hover:text-foreground"
                )}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
