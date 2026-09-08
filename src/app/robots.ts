import { MetadataRoute } from 'next';

/**
 * Aplikasi keuangan pribadi & keluarga memuat informasi sensitif.
 * Melarang perayapan publik oleh web crawler / bot pencari.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
