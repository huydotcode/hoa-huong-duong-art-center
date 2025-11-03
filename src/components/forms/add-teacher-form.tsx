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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addClassTeachers } from "@/lib/services/admin-classes-service";
import { getTeachers } from "@/lib/services/admin-teachers-service";
import { type Teacher } from "@/types";
import { z } from "zod";
import { Search, X } from "lucide-react";

const addTeacherSchema = z.object({
  teacher_ids: z
    .array(z.string())
    .min(1, "Vui lòng chọn ít nhất một giáo viên."),
});

type AddTeacherSchema = z.infer<typeof addTeacherSchema>;

interface AddTeacherFormProps {
  classId: string;
  assignedTeacherIds: string[];
  children: React.ReactNode;
}

export function AddTeacherForm({
  classId,
  assignedTeacherIds,
  children,
}: AddTeacherFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
  const path = usePathname();
  const router = useRouter();

  const form = useForm<AddTeacherSchema>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      teacher_ids: [],
    },
  });

  const searchTeachers = useCallback(
    async (query: string) => {
      if (query.trim().length === 0) {
        setTeachers([]);
        return;
      }

      setLoadingTeachers(true);
      try {
        const allTeachers = await getTeachers(query.trim());
        // Filter out already assigned teachers and already selected teachers
        const selectedIds = selectedTeachers.map((t) => t.id);
        const availableTeachers = allTeachers.filter(
          (t) =>
            !assignedTeacherIds.includes(t.id) && !selectedIds.includes(t.id)
        );
        setTeachers(availableTeachers);
      } catch (error) {
        console.error("Error searching teachers:", error);
        toast.error("Không thể tìm kiếm giáo viên");
        setTeachers([]);
      } finally {
        setLoadingTeachers(false);
      }
    },
    [assignedTeacherIds, selectedTeachers]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTeachers(searchQuery);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [searchQuery, searchTeachers]);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedTeachers([]);
      form.reset({
        teacher_ids: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: AddTeacherSchema) {
    setIsLoading(true);
    try {
      await addClassTeachers(classId, values.teacher_ids, path);
      toast.success(
        `Đã thêm ${values.teacher_ids.length} giáo viên vào lớp thành công!`
      );
      form.reset({
        teacher_ids: [],
      });
      setSelectedTeachers([]);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error adding teachers:", error);
      toast.error("Thêm giáo viên thất bại", {
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
          <DialogTitle>Thêm giáo viên vào lớp</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="teacher_ids"
              render={({ field }) => {
                const handleSelectTeacher = (teacher: Teacher) => {
                  if (!selectedTeachers.find((t) => t.id === teacher.id)) {
                    const newSelected = [...selectedTeachers, teacher];
                    setSelectedTeachers(newSelected);
                    const teacherIds = newSelected.map((t) => t.id);
                    form.setValue("teacher_ids", teacherIds);
                    field.onChange(teacherIds);
                  }
                  setSearchQuery("");
                  setTeachers([]);
                };

                const handleRemoveTeacher = (teacherId: string) => {
                  const newSelected = selectedTeachers.filter(
                    (t) => t.id !== teacherId
                  );
                  setSelectedTeachers(newSelected);
                  const teacherIds = newSelected.map((t) => t.id);
                  form.setValue("teacher_ids", teacherIds);
                  field.onChange(teacherIds);
                };

                return (
                  <FormItem>
                    <FormLabel>Tìm giáo viên</FormLabel>
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
                          {loadingTeachers ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Đang tìm...
                            </div>
                          ) : teachers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Không tìm thấy giáo viên
                            </div>
                          ) : (
                            <div className="p-1">
                              {teachers.map((teacher) => (
                                <div
                                  key={teacher.id}
                                  onClick={() => handleSelectTeacher(teacher)}
                                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                  <div className="font-medium">
                                    {teacher.full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {teacher.phone}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedTeachers.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Đã chọn: {selectedTeachers.length} giáo viên
                          </div>
                          <div className="max-h-40 space-y-1 overflow-auto rounded-md border bg-muted p-2">
                            {selectedTeachers.map((teacher) => (
                              <div
                                key={teacher.id}
                                className="flex items-center justify-between rounded-sm bg-background px-2 py-1.5"
                              >
                                <div>
                                  <div className="text-sm font-medium">
                                    {teacher.full_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {teacher.phone}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() =>
                                    handleRemoveTeacher(teacher.id)
                                  }
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
                  </FormItem>
                );
              }}
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
                disabled={isLoading || selectedTeachers.length === 0}
              >
                {isLoading
                  ? "Đang xử lý..."
                  : `Thêm ${selectedTeachers.length > 0 ? `(${selectedTeachers.length})` : ""}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
