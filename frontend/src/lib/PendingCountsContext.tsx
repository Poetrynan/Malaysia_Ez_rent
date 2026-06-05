'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PendingCounts {
  leases: number;
  feedback: number;
  agentReviews: number;
  unreadInbox: number;
}

interface PendingCountsContextType {
  counts: PendingCounts;
  updateCounts: (partial: Partial<PendingCounts>) => void;
}

const PendingCountsContext = createContext<PendingCountsContextType | undefined>(undefined);

export function PendingCountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<PendingCounts>({ leases: 0, feedback: 0, agentReviews: 0, unreadInbox: 0 });

  const updateCounts = useCallback((partial: Partial<PendingCounts>) => {
    setCounts(prev => {
      const next = { ...prev, ...partial };
      if (prev.leases === next.leases && prev.feedback === next.feedback && prev.agentReviews === next.agentReviews && prev.unreadInbox === next.unreadInbox) return prev;
      return next;
    });
  }, []);

  return (
    <PendingCountsContext.Provider value={{ counts, updateCounts }}>
      {children}
    </PendingCountsContext.Provider>
  );
}

export function usePendingCounts() {
  const ctx = useContext(PendingCountsContext);
  if (!ctx) throw new Error('usePendingCounts must be used within PendingCountsProvider');
  return ctx;
}
