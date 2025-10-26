import { Header } from "@/components/layout/header";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center p-2">
        {children}
      </main>
    </div>
  );
}
