'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function BrowsePageHeader({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link
        href="/"
        className="text-text-tertiary hover:text-text-secondary inline-flex items-center gap-1 py-1 text-sm transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>Home</span>
      </Link>
      <div className="border-border bg-surface-secondary/70 rounded-2xl border px-4 py-3 shadow-sm sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="text-text-tertiary text-[11px] font-semibold tracking-[0.18em] uppercase sm:text-xs">
              {label}
            </div>
            <h1 className="text-text-primary mt-1 text-lg font-semibold tracking-tight sm:text-xl">
              {title}
            </h1>
            {description && (
              <p className="text-text-secondary mt-1 text-xs leading-relaxed sm:text-sm">
                {description}
              </p>
            )}
          </div>
          {action && <div className="sm:shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  );
}
