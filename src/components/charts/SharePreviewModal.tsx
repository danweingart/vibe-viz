"use client";

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";

interface SharePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string | null;
  isLoading: boolean;
  title: string;
  onCopyImage: () => Promise<boolean>;
  onDownload: () => void;
}

export function SharePreviewModal({
  isOpen,
  onClose,
  imageDataUrl,
  isLoading,
  title,
  onCopyImage,
  onDownload,
}: SharePreviewModalProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopySuccess(false);
    }
  }, [isOpen]);

  const handleCopyImage = useCallback(async () => {
    setIsCopying(true);
    setCopySuccess(false);
    try {
      const success = await onCopyImage();
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch {
      // Copy failed silently - user can use download instead
    } finally {
      setIsCopying(false);
    }
  }, [onCopyImage]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      {/* Modal content */}
      <div className="relative bg-background-secondary rounded-2xl border border-border p-5 max-w-[520px] w-full mx-4 shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-foreground-muted hover:text-foreground hover:bg-border/50 transition-colors"
          aria-label="Close"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2
          id="export-modal-title"
          className="font-brice text-lg text-foreground mb-4 pr-8"
        >
          Export {title}
        </h2>

        {/* Image preview */}
        <div className="aspect-square bg-background rounded-xl overflow-hidden mb-5 border border-border/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <LoadingSpinner className="w-8 h-8 text-brand" />
              <span className="text-sm text-foreground-muted">Generating preview...</span>
            </div>
          ) : imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Export preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-foreground-muted">
              Failed to generate preview
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            disabled={isLoading || !imageDataUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-background font-medium text-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopyImage}
            disabled={isLoading || !imageDataUrl || isCopying}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              copySuccess
                ? "border-chart-success bg-chart-success/10 text-chart-success"
                : "border-border hover:border-border-hover hover:bg-border/30 text-foreground"
            }`}
          >
            {isCopying ? (
              <>
                <LoadingSpinner className="w-4 h-4" />
                <span>Copying...</span>
              </>
            ) : copySuccess ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>Copy Image</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to escape any parent overflow/positioning issues
  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// Icons
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
