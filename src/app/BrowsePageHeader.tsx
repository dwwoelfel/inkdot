'use client';

import Link from 'next/link';

export function BrowsePageHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      <Link
        href="/"
        className="text-text-tertiary hover:text-text-secondary inline-flex items-center gap-1 text-xs transition-colors sm:text-sm"
      >
        <span aria-hidden="true">&larr;</span>
        <span>Home</span>
      </Link>
      <div className="border-border bg-surface-secondary/70 rounded-2xl border px-4 py-3 shadow-sm sm:px-5 sm:py-4">
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
    </div>
  );
}
