import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: '5-Star Ambassador',
        short_name: '5-Star',
        description: 'Achariya 5-Star Ambassador Program Portal',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#DC2626', // Achariya Red
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
