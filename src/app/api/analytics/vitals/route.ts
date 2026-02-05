import { NextResponse } from 'next/server';

/**
 * API endpoint to collect Web Vitals metrics
 * Called automatically by reportWebVitals in production
 */
export async function POST(request: Request) {
    try {
        const metric = await request.json();

        // Log metric (in production, send to analytics service)
        console.log('Web Vital:', {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            timestamp: new Date().toISOString()
        });

        // TODO: Send to analytics service (Google Analytics, Vercel Analytics, etc.)
        // Example for Google Analytics:
        // if (typeof gtag !== 'undefined') {
        //     gtag('event', metric.name, {
        //         value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        //         event_category: 'Web Vitals',
        //         event_label: metric.id,
        //         non_interaction: true,
        //     });
        // }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error logging web vital:', error);
        return NextResponse.json({ error: 'Failed to log metric' }, { status: 500 });
    }
}
