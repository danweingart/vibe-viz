"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui";
import { SharePreviewModal } from "@/components/charts/SharePreviewModal";
import {
  generatePngDataUrl,
  copyImageToClipboard,
  shareViaWebShare,
  downloadFromDataUrl,
} from "@/lib/chartExport/simple";
import type { ChartExportConfig } from "@/components/charts/StandardChartCard";

interface ShareButtonProps {
  /** Callback to get the export element (renders ExportTemplate off-screen) */
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

  const handleShareToX = useCallback(async () => {
    if (!imageDataUrl) return;

    const success = await shareViaWebShare(imageDataUrl);
    if (!success) {
      // Fallback: copy to clipboard and open X compose
      const copied = await copyImageToClipboard(imageDataUrl);
      window.open("https://twitter.com/intent/tweet", "_blank");
      if (copied) {
        // Image is in clipboard, user can paste it
      }
    }
  }, [imageDataUrl]);

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
        aria-label="Share chart"
        className="flex items-center gap-1.5"
      >
        <ShareIcon className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Share</span>
      </Button>

      <SharePreviewModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        imageDataUrl={imageDataUrl}
        isLoading={isGenerating}
        title={config.title}
        onShareToX={handleShareToX}
        onCopyImage={handleCopyImage}
        onDownload={handleDownload}
      />
    </>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
