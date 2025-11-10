"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/services/admin-users-service";
import {
  changePasswordSchema,
  type ChangePasswordSchema,
} from "@/lib/validations/auth";

interface ChangePasswordMenuItemProps {
  className?: string;
}

export function ChangePasswordMenuItem({
  className,
}: ChangePasswordMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ChangePasswordSchema>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  async function onSubmit(values: ChangePasswordSchema) {
    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success("Đổi mật khẩu thành công!");
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Không thể đổi mật khẩu", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !isSubmitting && setOpen(value)}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem
          className={className}
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          <span>Đổi mật khẩu</span>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Nhập mật khẩu hiện tại"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Nhập mật khẩu mới" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Nhập lại mật khẩu mới"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đổi...
                  </>
                ) : (
                  "Đổi mật khẩu"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
