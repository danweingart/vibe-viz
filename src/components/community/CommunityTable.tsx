"use client";

import { useState, useRef, useEffect } from "react";
import { formatAddress } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  hideOnMobile?: boolean;
  width?: string;
}

interface CommunityTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  maxRows?: number;
}

export function CommunityTable<T>({
  data,
  columns,
  isLoading,
  emptyMessage = "No data available",
  maxRows = 25,
}: CommunityTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={5} />;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gvc-text-muted text-sm">
        {emptyMessage}
      </div>
    );
  }

  const visibleData = data.slice(0, maxRows);
  const hasMore = data.length > maxRows;
  const [expanded, setExpanded] = useState(false);
  const displayData = expanded ? data : visibleData;

  return (
    <div>
      <div
        className={`overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${
          !expanded && hasMore ? "max-h-[700px] overflow-y-auto" : ""
        }`}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gvc-card z-10">
            <tr className="border-b border-gvc-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`py-2 px-2 font-medium text-gvc-text-muted uppercase tracking-wider text-[11px] whitespace-nowrap ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gvc-border/50 hover:bg-gvc-border/20 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-2 px-2 ${
                      col.align === "right" || col.align === "center" ? "whitespace-nowrap" : ""
                    } ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 mt-1 text-xs text-gvc-text-muted hover:text-brand transition-colors border-t border-gvc-border/30"
        >
          {expanded
            ? "Show less"
            : `Show all ${data.length} rows (+${data.length - maxRows} more)`}
        </button>
      )}
    </div>
  );
}

function TableSkeleton({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-gvc-border/50 rounded animate-shimmer flex-1"
              style={{ maxWidth: j === 0 ? "40px" : j === 1 ? "200px" : "100px" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Renders an address with display name and inline tag editing.
 */
export function AddressCell({
  address,
  displayName,
  isTagged,
  twitter,
  onTag,
}: {
  address: string;
  displayName: string | null;
  isTagged?: boolean;
  twitter?: string | null;
  onTag?: (address: string, name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const profileUrl = `https://opensea.io/${address}`;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInputValue(isTagged && displayName ? displayName : "");
    setEditing(true);
  };

  const saveTag = () => {
    setEditing(false);
    if (!onTag) return;
    const trimmed = inputValue.trim();
    if (trimmed) {
      onTag(address, trimmed);
    } else if (isTagged) {
      onTag(address, null);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTag();
            if (e.key === "Escape") cancelEditing();
          }}
          onBlur={saveTag}
          placeholder="Enter tag name..."
          className="bg-gvc-border/50 border border-brand/40 rounded-md px-2 py-0.5 text-xs text-gvc-text w-36 outline-none focus:border-brand"
        />
      </div>
    );
  }

  return (
    <div className="group/addr inline-flex items-center gap-1.5 min-w-0">
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-col min-w-0"
      >
        {displayName ? (
          <span className="inline-flex items-center gap-1">
            <span className={`${isTagged ? "text-gvc-green" : "text-brand"} hover:underline font-medium truncate`}>
              {displayName}
            </span>
            {isTagged && (
              <span className="text-[8px] text-gvc-green/60 uppercase tracking-wider shrink-0">tag</span>
            )}
          </span>
        ) : (
          <span className="text-gvc-text hover:text-brand hover:underline font-mono text-xs">
            {formatAddress(address, 6)}
          </span>
        )}
      </a>
      {twitter && (
        <a
          href={`https://x.com/${twitter}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-gvc-text-muted hover:text-gvc-text transition-colors"
          title={`@${twitter}`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      )}
      {onTag && (
        <button
          onClick={startEditing}
          className="opacity-0 group-hover/addr:opacity-100 transition-opacity p-0.5 text-gvc-text-muted hover:text-brand shrink-0"
          title="Tag this account"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}
