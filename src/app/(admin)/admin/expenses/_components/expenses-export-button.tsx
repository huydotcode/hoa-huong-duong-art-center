"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadBase64File } from "@/lib/utils/download";
import { exportExpensesToExcel } from "@/lib/services/admin-expenses-export-service";
import { toast } from "sonner";

interface ExpensesExportButtonProps {
  viewMode: "month" | "year";
  month: number;
  year: number;
  query: string;
}

export default function ExpensesExportButton({
  viewMode,
  month,
  year,
  query,
}: ExpensesExportButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const result = await exportExpensesToExcel({
          viewMode,
          month: viewMode === "month" ? month : undefined,
          year,
          query,
        });

        downloadBase64File(
          result.fileData,
          result.mimeType,
          result.fileName
        );
        toast.success("Xuất Excel thành công");
      } catch (error) {
        console.error("Export expenses error:", error);
        toast.error("Xuất Excel thất bại", {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại.",
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="whitespace-nowrap"
      onClick={handleExport}
      disabled={isPending}
    >
      <Download className="mr-2 h-4 w-4" />
      {isPending ? "Đang xuất..." : "Xuất Excel"}
    </Button>
  );
}

