/** Sitenin herkese açık adresi. Canlıda NEXT_PUBLIC_SITE_URL ayarlanmalıdır. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
