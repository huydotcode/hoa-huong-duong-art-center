"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  children: React.ReactNode;
}

export function CreateClassForm({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Thêm lớp học (UI demo)</DialogTitle>
          <DialogDescription>
            Đây là form demo UI dùng mock, chưa nối dữ liệu thật.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên lớp</Label>
            <Input id="name" placeholder="Nhập tên lớp" autoComplete="off" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="monthly_fee">Học phí/tháng</Label>
              <Input
                id="monthly_fee"
                type="number"
                placeholder="Nhập học phí"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Lương/buổi</Label>
              <Input id="salary" type="number" placeholder="Nhập lương/buổi" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Ngày bắt đầu</Label>
              <Input id="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Ngày kết thúc</Label>
              <Input id="end_date" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lịch học (ví dụ)</Label>
            <Input placeholder="VD: T2 08:00, T5 08:00" />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Lưu (mock)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
