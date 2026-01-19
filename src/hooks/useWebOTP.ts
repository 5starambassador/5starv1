import { useEffect, useRef } from 'react';

export const useWebOTP = (onOtpReceived: (otp: string) => void) => {
    const abortController = useRef<AbortController | null>(null);

    useEffect(() => {
        if ('OTPCredential' in window) {
            abortController.current = new AbortController();

            // @ts-ignore - OTPCredential is not yet in standard lib dom types
            navigator.credentials.get({
                otp: { transport: ['sms'] },
                signal: abortController.current.signal,
            } as any)
                .then((content: any) => {
                    if (content && content.code) {
                        onOtpReceived(content.code);
                    }
                })
                .catch((err) => {
                    // Ignore abort errors as they are expected on unmount
                    if (err.name !== 'AbortError') {
                        console.error('WebOTP API Error:', err);
                    }
                });
        }

        return () => {
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, [onOtpReceived]);
};
