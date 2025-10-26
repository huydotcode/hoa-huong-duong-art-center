import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./styles/globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Hoa Hướng Dương - Art Center",
  description: "Hệ thống quản lý trung tâm nghệ thuật Hoa Hướng Dương",
  icons: {
    icon: "/assets/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${beVietnamPro.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
