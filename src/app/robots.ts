import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/superadmin/', '/campus/', '/api/'],
        },
        sitemap: 'https://ambassador.achariya.in/sitemap.xml',
    }
}
