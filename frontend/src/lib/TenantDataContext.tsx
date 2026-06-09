'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type IdentityType = 'malaysian' | 'international_student' | 'international_other';

interface TenantDataContextType {
  interest: any | null;
  setInterest: React.Dispatch<React.SetStateAction<any | null>>;
  interestUnit: any | null;
  setInterestUnit: React.Dispatch<React.SetStateAction<any | null>>;
  interestCommunity: any | null;
  setInterestCommunity: React.Dispatch<React.SetStateAction<any | null>>;
  lease: any | null;
  setLease: React.Dispatch<React.SetStateAction<any | null>>;
  leaseHistory: any[];
  setLeaseHistory: React.Dispatch<React.SetStateAction<any[]>>;
  roommates: any[];
  setRoommates: React.Dispatch<React.SetStateAction<any[]>>;
  payments: any[];
  setPayments: React.Dispatch<React.SetStateAction<any[]>>;
  unit: any | null;
  setUnit: React.Dispatch<React.SetStateAction<any | null>>;
  community: any | null;
  setCommunity: React.Dispatch<React.SetStateAction<any | null>>;
  myFeedbacks: any[];
  setMyFeedbacks: React.Dispatch<React.SetStateAction<any[]>>;
  feedbackUnreadCount: number;
  setFeedbackUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  profileName: string;
  setProfileName: React.Dispatch<React.SetStateAction<string>>;
  profilePhone: string;
  setProfilePhone: React.Dispatch<React.SetStateAction<string>>;
  profileUnit: string;
  setProfileUnit: React.Dispatch<React.SetStateAction<string>>;
  profilePassport: string;
  setProfilePassport: React.Dispatch<React.SetStateAction<string>>;
  profileSchool: string;
  setProfileSchool: React.Dispatch<React.SetStateAction<string>>;
  profileCompany: string;
  setProfileCompany: React.Dispatch<React.SetStateAction<string>>;
  profileLocalId: string;
  setProfileLocalId: React.Dispatch<React.SetStateAction<string>>;
  profileDocUrl: string | null;
  setProfileDocUrl: React.Dispatch<React.SetStateAction<string | null>>;
  profileStudentCardUrl: string | null;
  setProfileStudentCardUrl: React.Dispatch<React.SetStateAction<string | null>>;
  profileIdentityType: IdentityType | null;
  setProfileIdentityType: React.Dispatch<React.SetStateAction<IdentityType | null>>;
  icFrontUrl: string | null;
  setIcFrontUrl: React.Dispatch<React.SetStateAction<string | null>>;
  icBackUrl: string | null;
  setIcBackUrl: React.Dispatch<React.SetStateAction<string | null>>;
  passportPhotoUrl: string | null;
  setPassportPhotoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  workPermitUrl: string | null;
  setWorkPermitUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isLoaded: boolean;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  profileLoaded: boolean;
  setProfileLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  clearCache: () => void;
}

const TenantDataContext = createContext<TenantDataContextType | undefined>(undefined);

export function TenantDataProvider({ children }: { children: React.ReactNode }) {
  const [interest, setInterest] = useState<any | null>(null);
  const [interestUnit, setInterestUnit] = useState<any | null>(null);
  const [interestCommunity, setInterestCommunity] = useState<any | null>(null);
  const [lease, setLease] = useState<any | null>(null);
  const [leaseHistory, setLeaseHistory] = useState<any[]>([]);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [unit, setUnit] = useState<any | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);

  // Profile data
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileUnit, setProfileUnit] = useState('');
  const [profilePassport, setProfilePassport] = useState('');
  const [profileSchool, setProfileSchool] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileLocalId, setProfileLocalId] = useState('');
  const [profileDocUrl, setProfileDocUrl] = useState<string | null>(null);
  const [profileStudentCardUrl, setProfileStudentCardUrl] = useState<string | null>(null);
  const [profileIdentityType, setProfileIdentityType] = useState<IdentityType | null>(null);
  const [icFrontUrl, setIcFrontUrl] = useState<string | null>(null);
  const [icBackUrl, setIcBackUrl] = useState<string | null>(null);
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [workPermitUrl, setWorkPermitUrl] = useState<string | null>(null);

  // Load flags
  const [isLoaded, setIsLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const clearCache = useCallback(() => {
    setIsLoaded(false);
    setProfileLoaded(false);
    setProfileIdentityType(null);
    setIcFrontUrl(null);
    setIcBackUrl(null);
    setPassportPhotoUrl(null);
    setWorkPermitUrl(null);
  }, []);

  const value = useMemo(() => ({
    interest, setInterest,
    interestUnit, setInterestUnit,
    interestCommunity, setInterestCommunity,
    lease, setLease,
    leaseHistory, setLeaseHistory,
    roommates, setRoommates,
    payments, setPayments,
    unit, setUnit,
    community, setCommunity,
    myFeedbacks, setMyFeedbacks,
    feedbackUnreadCount, setFeedbackUnreadCount,
    profileName, setProfileName,
    profilePhone, setProfilePhone,
    profileUnit, setProfileUnit,
    profilePassport, setProfilePassport,
    profileSchool, setProfileSchool,
    profileCompany, setProfileCompany,
    profileLocalId, setProfileLocalId,
    profileDocUrl, setProfileDocUrl,
    profileStudentCardUrl, setProfileStudentCardUrl,
    profileIdentityType, setProfileIdentityType,
    icFrontUrl, setIcFrontUrl,
    icBackUrl, setIcBackUrl,
    passportPhotoUrl, setPassportPhotoUrl,
    workPermitUrl, setWorkPermitUrl,
    isLoaded, setIsLoaded,
    profileLoaded, setProfileLoaded,
    clearCache,
  }), [
    interest, interestUnit, interestCommunity, lease, leaseHistory, roommates, payments, unit, community,
    myFeedbacks, feedbackUnreadCount, profileName, profilePhone, profileUnit, profilePassport, profileSchool,
    profileCompany, profileLocalId, profileDocUrl, profileStudentCardUrl, profileIdentityType,
    icFrontUrl, icBackUrl, passportPhotoUrl, workPermitUrl, isLoaded, profileLoaded, clearCache,
  ]);

  return (
    <TenantDataContext.Provider value={value}>
      {children}
    </TenantDataContext.Provider>
  );
}

export function useTenantData() {
  const context = useContext(TenantDataContext);
  if (context === undefined) {
    throw new Error('useTenantData must be used within a TenantDataProvider');
  }
  return context;
}

