"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { exportSaleToCanvas } from "@/lib/saleExport";
import type { SaleRecord } from "@/types/api";

interface SaleShareButtonProps {
  sale: SaleRecord;
  className?: string;
}

export function SaleShareButton({ sale, className }: SaleShareButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsExporting(true);
    try {
      await exportSaleToCanvas(sale);
    } catch (error) {
      console.error("Failed to export sale:", error);
    } finally {
      setIsExporting(false);
    }
  }, [sale]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      isLoading={isExporting}
      aria-label={`Download social graphic for ${sale.tokenName}`}
      className={className}
    >
      <DownloadIcon className="w-4 h-4" />
    </Button>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
