"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className="sm:flex-none"
      onClick={() => router.refresh()}
    >
      <RefreshCw className="h-4 w-4" />
      <span className="hidden sm:inline">Tải lại</span>
    </Button>
  );
}
