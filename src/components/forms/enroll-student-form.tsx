"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enrollStudents } from "@/lib/services/admin-classes-service";
import { getStudents } from "@/lib/services/admin-students-service";
import { type Student } from "@/types";
import { z } from "zod";
import { Search, X } from "lucide-react";

const enrollStudentSchema = z.object({
  student_ids: z
    .array(z.string())
    .min(1, "Vui lòng chọn ít nhất một học sinh."),
  status: z.enum(["trial", "active", "inactive"]),
  enrollment_date: z.string().optional(),
});

type EnrollStudentSchema = z.infer<typeof enrollStudentSchema>;

interface EnrollStudentFormProps {
  classId: string;
  enrolledStudentIds: string[];
  children: React.ReactNode;
}

export function EnrollStudentForm({
  classId,
  enrolledStudentIds,
  children,
}: EnrollStudentFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const path = usePathname();
  const router = useRouter();

  const form = useForm<EnrollStudentSchema>({
    resolver: zodResolver(enrollStudentSchema),
    defaultValues: {
      student_ids: [],
      status: "trial",
      enrollment_date: new Date().toISOString().split("T")[0],
    },
  });

  const searchStudents = useCallback(
    async (query: string) => {
      if (query.trim().length === 0) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        const allStudents = await getStudents(query.trim());
        // Filter out already enrolled students and already selected students
        const selectedIds = selectedStudents.map((s) => s.id);
        const availableStudents = allStudents.filter(
          (s) =>
            !enrolledStudentIds.includes(s.id) && !selectedIds.includes(s.id)
        );
        setStudents(availableStudents);
      } catch (error) {
        console.error("Error searching students:", error);
        toast.error("Không thể tìm kiếm học sinh");
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    },
    [enrolledStudentIds, selectedStudents]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchStudents(searchQuery);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [searchQuery, searchStudents]);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedStudents([]);
      form.reset({
        student_ids: [],
        status: "trial",
        enrollment_date: new Date().toISOString().split("T")[0],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSelectStudent(student: Student) {
    if (!selectedStudents.find((s) => s.id === student.id)) {
      const newSelected = [...selectedStudents, student];
      setSelectedStudents(newSelected);
      form.setValue(
        "student_ids",
        newSelected.map((s) => s.id)
      );
    }
    setSearchQuery("");
    setStudents([]);
  }

  function handleRemoveStudent(studentId: string) {
    const newSelected = selectedStudents.filter((s) => s.id !== studentId);
    setSelectedStudents(newSelected);
    form.setValue(
      "student_ids",
      newSelected.map((s) => s.id)
    );
  }

  async function onSubmit(values: EnrollStudentSchema) {
    setIsLoading(true);
    try {
      await enrollStudents(
        classId,
        values.student_ids,
        {
          enrollment_date: values.enrollment_date,
          status: values.status,
        },
        path
      );
      toast.success(
        `Đã thêm ${values.student_ids.length} học sinh vào lớp thành công!`
      );
      form.reset({
        student_ids: [],
        status: "trial",
        enrollment_date: new Date().toISOString().split("T")[0],
      });
      setSelectedStudents([]);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error enrolling students:", error);
      toast.error("Thêm học sinh thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm học sinh vào lớp</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="student_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tìm học sinh</FormLabel>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Nhập tên hoặc số điện thoại..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        autoComplete="off"
                        disabled={isLoading}
                      />
                    </div>
                    {searchQuery.trim().length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
                        {loadingStudents ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Đang tìm...
                          </div>
                        ) : students.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Không tìm thấy học sinh
                          </div>
                        ) : (
                          <div className="p-1">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                onClick={() => handleSelectStudent(student)}
                                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                <div className="font-medium">
                                  {student.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.phone}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedStudents.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <div className="text-xs text-muted-foreground">
                          Đã chọn: {selectedStudents.length} học sinh
                        </div>
                        <div className="max-h-40 space-y-1 overflow-auto rounded-md border bg-muted p-2">
                          {selectedStudents.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between rounded-sm bg-background px-2 py-1.5"
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {student.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {student.phone}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleRemoveStudent(student.id)}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                  <input
                    type="hidden"
                    {...field}
                    value={field.value?.join(",")}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trial">Học thử</SelectItem>
                      <SelectItem value="active">Đang học</SelectItem>
                      <SelectItem value="inactive">Ngừng học</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isLoading || selectedStudents.length === 0}
              >
                {isLoading
                  ? "Đang xử lý..."
                  : `Thêm ${selectedStudents.length > 0 ? `(${selectedStudents.length})` : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
