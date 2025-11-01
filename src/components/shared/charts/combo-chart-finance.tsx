"use client";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { formatCurrencyVN, formatCurrencyShort } from "@/lib/utils";

type FinanceMonthly = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

interface Props {
  data: FinanceMonthly[];
}

export default function ComboChartFinance({ data }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          {/* Left axis for Revenue/Expenses starting at 0 */}
          <YAxis
            yAxisId="left"
            domain={[0, "dataMax"]}
            tickFormatter={(v) => formatCurrencyShort(Number(v))}
          />
          <Tooltip formatter={(v: number) => formatCurrencyVN(v)} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name="Doanh thu"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="expenses"
            name="Chi phí"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
