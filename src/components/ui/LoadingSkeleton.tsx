import React from 'react';

export function CardSkeleton() {
  return (
    <div className="p-5 bg-surface border border-border rounded-2xl animate-pulse space-y-3">
      <div className="h-4 bg-surface-2 rounded-md w-1/3" />
      <div className="h-7 bg-surface-2 rounded-lg w-2/3" />
      <div className="h-3 bg-surface-2 rounded-md w-1/2" />
    </div>
  );
}

export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 w-2/3">
        <div className="w-10 h-10 bg-surface-2 rounded-xl shrink-0" />
        <div className="space-y-1.5 w-full">
          <div className="h-4 bg-surface-2 rounded w-3/4" />
          <div className="h-3 bg-surface-2 rounded w-1/2" />
        </div>
      </div>
      <div className="h-5 bg-surface-2 rounded w-1/4" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-36 bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between">
        <div className="h-4 bg-surface-2 rounded w-32" />
        <div className="h-8 bg-surface-2 rounded w-56" />
        <div className="h-4 bg-surface-2 rounded w-44" />
      </div>

      {/* Grid Menu Skeleton */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-surface border border-border rounded-2xl">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-2">
            <div className="w-11 h-11 bg-surface-2 rounded-xl" />
            <div className="h-2.5 bg-surface-2 rounded w-12" />
          </div>
        ))}
      </div>

      {/* Transactions Skeleton */}
      <div className="space-y-3">
        <div className="h-5 bg-surface-2 rounded w-36 mb-2" />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
      </div>
    </div>
  );
}
