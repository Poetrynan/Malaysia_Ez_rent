'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface AdminDataContextType {
  communities: any[];
  setCommunities: React.Dispatch<React.SetStateAction<any[]>>;
  units: any[];
  setUnits: React.Dispatch<React.SetStateAction<any[]>>;
  leases: any[];
  setLeases: React.Dispatch<React.SetStateAction<any[]>>;
  interests: any[];
  setInterests: React.Dispatch<React.SetStateAction<any[]>>;
  allUsers: any[];
  setAllUsers: React.Dispatch<React.SetStateAction<any[]>>;
  adminIds: string[];
  setAdminIds: React.Dispatch<React.SetStateAction<string[]>>;
  adminList: any[];
  setAdminList: React.Dispatch<React.SetStateAction<any[]>>;
  agentRegistrations: any[];
  setAgentRegistrations: React.Dispatch<React.SetStateAction<any[]>>;
  feedbacks: any[];
  setFeedbacks: React.Dispatch<React.SetStateAction<any[]>>;
  reviews: any[];
  setReviews: React.Dispatch<React.SetStateAction<any[]>>;
  reviewsLoaded: boolean;
  setReviewsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  isLoaded: boolean;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  clearCache: () => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [communities, setCommunities] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [agentRegistrations, setAgentRegistrations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const clearCache = useCallback(() => {
    setIsLoaded(false);
    setReviewsLoaded(false);
  }, []);

  return (
    <AdminDataContext.Provider
      value={{
        communities,
        setCommunities,
        units,
        setUnits,
        leases,
        setLeases,
        interests,
        setInterests,
        allUsers,
        setAllUsers,
        adminIds,
        setAdminIds,
        adminList,
        setAdminList,
        agentRegistrations,
        setAgentRegistrations,
        feedbacks,
        setFeedbacks,
        reviews,
        setReviews,
        reviewsLoaded,
        setReviewsLoaded,
        isLoaded,
        setIsLoaded,
        clearCache,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}
