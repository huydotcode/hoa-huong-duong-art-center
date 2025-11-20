"use client";

import { useMemo, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { Copy, Check, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export function StudentQRDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
}: {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const qrUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/parent?studentId=${studentId}`;
  }, [studentId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      toast.success("Đã sao chép link!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép link");
    }
  };

  // Convert SVG to canvas and then to blob
  const svgToImage = async (size: number = 2048): Promise<Blob | null> => {
    if (!qrCodeRef.current) return null;

    const svgElement = qrCodeRef.current.querySelector("svg");
    if (!svgElement) return null;

    try {
      // Clone SVG để không ảnh hưởng đến SVG gốc
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Get original viewBox to maintain aspect ratio
      const originalViewBox = svgElement.getAttribute("viewBox");
      const viewBoxSize = originalViewBox
        ? parseInt(originalViewBox.split(" ")[2] || "256")
        : 256;

      // Set size cho cloned SVG với viewBox gốc
      clonedSvg.setAttribute("width", size.toString());
      clonedSvg.setAttribute("height", size.toString());
      clonedSvg.setAttribute("viewBox", `0 0 ${viewBoxSize} ${viewBoxSize}`);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Fill white background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);

          // Draw image
          ctx.drawImage(img, 0, 0, size, size);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(svgUrl);
            resolve(blob);
          }, "image/png");
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("Failed to load SVG"));
        };
        img.src = svgUrl;
      });
    } catch (error) {
      console.error("Error converting SVG to image:", error);
      return null;
    }
  };

  const handleDownload = async () => {
    const blob = await svgToImage(2048); // High resolution for download
    if (!blob) {
      toast.error("Không thể tạo hình ảnh QR code");
      return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR-${studentName}-${studentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống QR code!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Không thể tải xuống QR code");
    }
  };

  const handleCopyImage = async () => {
    const blob = await svgToImage(2048); // High resolution for copy
    if (!blob) {
      toast.error("Không thể tạo hình ảnh QR code");
      return;
    }

    try {
      // Check if Clipboard API supports images
      if (navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({
          "image/png": blob,
        });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        toast.success("Đã sao chép QR code vào clipboard!");
        setTimeout(() => setCopiedImage(false), 2000);
      } else {
        toast.error("Trình duyệt không hỗ trợ sao chép hình ảnh");
      }
    } catch (error) {
      console.error("Copy image error:", error);
      toast.error("Không thể sao chép QR code");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code cho phụ huynh</DialogTitle>
          <DialogDescription>
            Quét mã QR để xem thông tin của {studentName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-w-full">
          <div
            ref={qrCodeRef}
            className="flex justify-center p-4 bg-white rounded-lg w-full"
          >
            <QRCode value={qrUrl} size={256} level="H" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopy}
                title="Sao chép link"
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Sao chép liên kết
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyImage}
                disabled={copiedImage}
              >
                {copiedImage ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Sao chép QR code
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Tải xuống
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Gửi link hoặc QR code này cho phụ huynh để họ có thể tra cứu thông
              tin học sinh
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
