import { MetadataRoute } from 'next';

const BASE_URL = 'https://ezrent.my';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 主要页面
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 动态页面可以在这里添加
  // 例如：房源详情页、小区详情页等

  return [...mainPages];
}
