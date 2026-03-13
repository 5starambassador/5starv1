/**
 * Simple encryption/decryption utilities for referral codes
 * Uses base64 encoding with a simple XOR cipher for obfuscation
 */

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'ACHARIYA_25TH_YEAR_2025_SECRET';

/**
 * Encrypts a referral code for URL usage
 */
export function encryptReferralCode(code: string): string {
    if (!code) return '';

    try {
        // XOR cipher with secret key
        const encrypted = code.split('').map((char, i) => {
            const keyChar = SECRET_KEY[i % SECRET_KEY.length];
            return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        }).join('');

        // Base64 encode for URL safety
        // Strip any whitespace/newlines that Buffer.toString may introduce
        const base64 = Buffer.from(encrypted, 'binary').toString('base64').replace(/[\r\n\s]/g, '');

        // Make URL-safe
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (error) {
        console.error('Encryption error:', error);
        return code; // Fallback to original
    }
}

/**
 * Decrypts a referral code from URL
 */
export function decryptReferralCode(encryptedCode: string): string {
    if (!encryptedCode) return '';

    try {
        // Restore base64 padding and special chars
        let base64 = encryptedCode.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }

        // Base64 decode
        const encrypted = Buffer.from(base64, 'base64').toString('binary');

        // XOR decipher with same secret key
        const decrypted = encrypted.split('').map((char, i) => {
            const keyChar = SECRET_KEY[i % SECRET_KEY.length];
            return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        }).join('');

        // Strip any trailing control characters (e.g. \n from XOR producing ASCII 10)
        return decrypted.replace(/[\x00-\x1F\x7F]/g, '');
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedCode; // Fallback to try original
    }
}
