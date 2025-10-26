import Link from "next/link";
import LoginForm from "@/components/forms/login-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <Card className="py-10">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>
            Nhập email/số điện thoại và mật khẩu của bạn để tiếp tục.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="mb-2 text-sm text-muted-foreground">
          Bạn là phụ huynh muốn tra cứu thông tin?
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/parent">Tra cứu thông tin học sinh</Link>
        </Button>
      </div>
    </div>
  );
}
