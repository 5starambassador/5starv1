/**
 * Web Vitals Monitoring
 * Tracks Core Web Vitals and reports to analytics
 */

export function reportWebVitals(metric: any) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.log(metric);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
        const body = JSON.stringify(metric);
        const url = '/api/analytics/vitals';

        // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, body);
        } else {
            fetch(url, {
                body,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(console.error);
        }
    }
}

// Performance budgets (in milliseconds)
export const PERFORMANCE_BUDGETS = {
    FCP: 1800,  // First Contentful Paint
    LCP: 2500,  // Largest Contentful Paint
    FID: 100,   // First Input Delay
    CLS: 0.1,   // Cumulative Layout Shift
    TTFB: 600,  // Time to First Byte
    INP: 200    // Interaction to Next Paint
} as const;

// Check if metric exceeds budget
export function isWithinBudget(metricName: keyof typeof PERFORMANCE_BUDGETS, value: number): boolean {
    const budget = PERFORMANCE_BUDGETS[metricName];
    return value <= budget;
}

// Get performance grade based on value
export function getPerformanceGrade(metricName: keyof typeof PERFORMANCE_BUDGETS, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, { good: number; poor: number }> = {
        FCP: { good: 1800, poor: 3000 },
        LCP: { good: 2500, poor: 4000 },
        FID: { good: 100, poor: 300 },
        CLS: { good: 0.1, poor: 0.25 },
        TTFB: { good: 600, poor: 1500 },
        INP: { good: 200, poor: 500 }
    };

    const threshold = thresholds[metricName];
    if (!threshold) return 'needs-improvement';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
}
