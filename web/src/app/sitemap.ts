import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/chat',
    '/rooms',
    '/rooms/gaming',
    '/rooms/music',
    '/rooms/anime',
    '/rooms/coding',
    '/rooms/movies',
    '/rooms/india',
    '/rooms/college',
    '/rooms/late-night',
    '/omegle-alternative',
    '/random-chat',
    '/rules',
    '/faq',
    '/privacy',
    '/terms',
    '/contact',
  ];

  const now = new Date();

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === '' || route === '/rooms' ? 'hourly' : 'weekly',
    priority:
      route === ''
        ? 1.0
        : route === '/rooms' || route === '/chat' || route === '/omegle-alternative' || route === '/random-chat'
        ? 0.9
        : 0.6,
  }));
}
