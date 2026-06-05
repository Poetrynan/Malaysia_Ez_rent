'use client';

import React from 'react';
import AdminPanel from '@/components/AdminPanel';
import { useAuth } from '@/lib/AuthContext';
import { usePendingCounts } from '@/lib/PendingCountsContext';
import { useRouter } from 'next/navigation';

interface AdminPageWrapperProps {
  defaultTab: 'dashboard' | 'properties' | 'leases' | 'admins' | 'feedback' | 'agent-reviews' | 'reviews' | 'profile';
  superAdminOnly?: boolean;
}

export default function AdminPageWrapper({ defaultTab, superAdminOnly }: AdminPageWrapperProps) {
  const { adminRole } = useAuth();
  const { updateCounts } = usePendingCounts();
  const router = useRouter();

  // Super-admin guard
  if (superAdminOnly && adminRole !== 'super_admin') {
    return null;
  }

  return (
    <AdminPanel
      adminRole={adminRole}
      defaultTab={defaultTab}
      hideTabBar={true}
      onPendingCountsChange={(leasesCount, feedbackCount, agentReviewsCount) => {
        updateCounts({
          leases: leasesCount,
          feedback: feedbackCount,
          ...(agentReviewsCount !== undefined ? { agentReviews: agentReviewsCount } : {}),
        });
      }}
      onTabChange={(tab) => router.push(`/admin/${tab}`)}
    />
  );
}
