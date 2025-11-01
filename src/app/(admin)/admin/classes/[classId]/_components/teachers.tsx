import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";

export default function TeachersSection({
  teachers,
}: {
  teachers: { id: string; full_name: string }[];
}) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="sm">Thêm giáo viên</Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Tên giáo viên</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {teachers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.full_name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
