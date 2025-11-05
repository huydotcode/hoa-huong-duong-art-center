"use client";

import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AttendanceOverviewCharts(props: {
  sessions: string[];
  studentAttendanceMap: Record<string, Record<string, boolean>>;
  totalStudents: number;
}) {
  const { sessions, studentAttendanceMap, totalStudents } = props;

  const studentData = sessions.map((s) => {
    const map = studentAttendanceMap[s] || {};
    const present = Object.values(map).filter(Boolean).length;
    const absent = Math.max(0, totalStudents - present);
    return { session: s, present, absent };
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="p-3 md:p-4">
        <div className="text-sm font-medium mb-3">Biểu đồ học sinh theo ca</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Có mặt" fill="#16a34a" />
              <Bar dataKey="absent" name="Vắng" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
