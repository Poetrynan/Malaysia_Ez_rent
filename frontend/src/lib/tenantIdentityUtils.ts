export type IdentityType = 'malaysian' | 'international_student' | 'international_other';

export interface TenantIdentityProfile {
  identity_type?: IdentityType | string | null;
  local_id_number?: string | null;
  passport_number?: string | null;
  ic_photo_front_url?: string | null;
  ic_photo_back_url?: string | null;
  passport_photo_url?: string | null;
}

export function hasTenantIdentityType(profile: TenantIdentityProfile | null | undefined): boolean {
  return !!profile?.identity_type;
}

export function getTenantIdentityMissingItems(
  profile: TenantIdentityProfile | null | undefined,
  lang: 'zh' | 'en',
): string[] {
  if (!profile?.identity_type) {
    return [lang === 'zh' ? '身份类型' : 'Identity type'];
  }

  const missing: string[] = [];

  if (profile.identity_type === 'malaysian') {
    if ((profile.local_id_number || '').replace(/[^0-9]/g, '').length !== 12) {
      missing.push(lang === 'zh' ? '身份证号码（12位）' : 'IC number (12 digits)');
    }
    if (!profile.ic_photo_front_url) {
      missing.push(lang === 'zh' ? '身份证正面照片' : 'IC front photo');
    }
    if (!profile.ic_photo_back_url) {
      missing.push(lang === 'zh' ? '身份证背面照片' : 'IC back photo');
    }
  } else {
    if (!profile.passport_number?.trim()) {
      missing.push(lang === 'zh' ? '护照号码' : 'Passport number');
    }
    if (!profile.passport_photo_url) {
      missing.push(lang === 'zh' ? '护照照片页' : 'Passport photo page');
    }
  }

  return missing;
}

export function isTenantIdentityFullyComplete(profile: TenantIdentityProfile | null | undefined): boolean {
  return getTenantIdentityMissingItems(profile, 'en').length === 0;
}

export const TENANT_IDENTITY_SELECT =
  'identity_type, local_id_number, passport_number, ic_photo_front_url, ic_photo_back_url, passport_photo_url';
