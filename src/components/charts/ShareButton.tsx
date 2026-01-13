"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { SharePreviewModal } from "@/components/charts/SharePreviewModal";
import {
  generatePngDataUrl,
  copyImageToClipboard,
  downloadFromDataUrl,
} from "@/lib/chartExport/simple";
import type { ChartExportConfig } from "@/components/charts/StandardChartCard";

interface ShareButtonProps {
  /** Callback to get the export element */
  getExportElement: () => Promise<HTMLDivElement | null>;
  /** Clean up after export */
  finishExport: () => void;
  /** Export configuration */
  config: ChartExportConfig;
}

export function ShareButton({ getExportElement, finishExport, config }: ShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenModal = useCallback(async () => {
    setModalOpen(true);
    setIsGenerating(true);
    setImageDataUrl(null);

    try {
      const element = await getExportElement();
      if (element) {
        const dataUrl = await generatePngDataUrl(element);
        setImageDataUrl(dataUrl);
      }
    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      finishExport();
      setIsGenerating(false);
    }
  }, [getExportElement, finishExport]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setImageDataUrl(null);
  }, []);

  const handleCopyImage = useCallback(async (): Promise<boolean> => {
    if (!imageDataUrl) return false;
    return copyImageToClipboard(imageDataUrl);
  }, [imageDataUrl]);

  const handleDownload = useCallback(() => {
    if (!imageDataUrl) return;
    downloadFromDataUrl(imageDataUrl, config.filename);
  }, [imageDataUrl, config.filename]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenModal}
        aria-label="Export chart"
        className="flex items-center gap-1.5"
      >
        <ExportIcon className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Export</span>
      </Button>

      <SharePreviewModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        imageDataUrl={imageDataUrl}
        isLoading={isGenerating}
        title={config.title}
        onCopyImage={handleCopyImage}
        onDownload={handleDownload}
      />
    </>
  );
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
