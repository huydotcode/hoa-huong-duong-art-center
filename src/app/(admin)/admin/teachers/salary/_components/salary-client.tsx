"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { TeacherSalarySummary } from "@/types/database";
import SalaryFilter from "./salary-filter";
import SalaryTable from "./salary-table";
import SalaryCards from "./salary-cards";
import SalaryDetailDialog from "./salary-detail-dialog";
import { exportSalaryToExcel } from "@/lib/utils/export-salary";

interface SalaryClientProps {
  initialSalaries: TeacherSalarySummary[];
  initialMonth: number;
  initialYear: number;
  initialTotal: number;
}

export default function SalaryClient({
  initialSalaries,
  initialMonth,
  initialYear,
  initialTotal,
}: SalaryClientProps) {
  const [selectedSalary, setSelectedSalary] =
    useState<TeacherSalarySummary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewDetails = (salary: TeacherSalarySummary) => {
    setSelectedSalary(salary);
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    exportSalaryToExcel(initialSalaries, initialMonth, initialYear);
  };

  return (
    <div className="space-y-6 px-4">
      <SalaryFilter
        total={initialTotal}
        month={initialMonth}
        year={initialYear}
        onExportClick={handleExport}
      />

      <Card>
        <SalaryTable
          salaries={initialSalaries}
          onViewDetails={handleViewDetails}
        />
        <SalaryCards
          salaries={initialSalaries}
          onViewDetails={handleViewDetails}
        />
      </Card>

      <SalaryDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        salary={selectedSalary}
        month={initialMonth}
        year={initialYear}
      />
    </div>
  );
}
