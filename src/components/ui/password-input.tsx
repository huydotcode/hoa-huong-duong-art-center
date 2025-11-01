"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends React.ComponentProps<typeof Input> {
  toggleAriaLabel?: string;
}

export function PasswordInput({
  toggleAriaLabel = "Hiển thị mật khẩu",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        autoComplete="off"
        {...props}
        className={props.className}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={toggleAriaLabel}
        className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}
