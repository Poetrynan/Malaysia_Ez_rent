import type { AdminContact, UnitWithCommunity } from '@/lib/ListingsDataContext';

export const ROOM_TYPES = ['Studio', 'Master Room', 'Medium Room', 'Small Room', 'Ensuite', 'Whole Unit'];

export function getUnitImages(unitId: string, mediaUrls?: string[]): string[] {
  if (mediaUrls && mediaUrls.length > 0) return mediaUrls;
  try {
    const stored = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
    if (stored[unitId]?.images?.length > 0) return stored[unitId].images;
  } catch {}
  return Array.from({ length: 4 }, (_, i) => `https://picsum.photos/seed/${unitId}${i}/600/400`);
}

export function getUnitVideo(unitId: string, videoUrl?: string | null): string | null {
  if (videoUrl) return videoUrl;
  try {
    const stored = JSON.parse(localStorage.getItem('ez_unit_media') || '{}');
    return stored[unitId]?.video || null;
  } catch {
    return null;
  }
}

export function getListingAgentLabel(
  unit: { agent_id?: string | null },
  admins: AdminContact[],
  lang: string,
): string | null {
  if (!unit.agent_id) return null;
  const agent = admins.find(a => a.id === unit.agent_id);
  const name = agent?.display_name?.trim();
  if (!name) return null;
  return lang === 'zh' ? `中介：${name}` : `Agent: ${name}`;
}
