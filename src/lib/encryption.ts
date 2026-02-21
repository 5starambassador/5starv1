import crypto from 'crypto'

/**
 * Standard AES-256-GCM encryption for field-level security.
 * Ensure ENCRYPTION_KEY is a 32-character string in your environment.
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

export function encrypt(text: string | null | undefined): string | null {
    if (!text) return null
    if (!ENCRYPTION_KEY) {
        console.error('Encryption failed: ENCRYPTION_KEY is missing in environment variables.')
        return null
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH)
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
        let encrypted = cipher.update(text, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        const authTag = cipher.getAuthTag().toString('hex')
        // Format: iv:authTag:encryptedContent
        return `${iv.toString('hex')}:${authTag}:${encrypted}`
    } catch (error) {
        console.error('Encryption failed:', error)
        return null // FAIL-SAFE: Return null instead of plain text
    }
}

export function decrypt(hash: string | null | undefined): string | null {
    if (!hash) return null
    // If it doesn't look like our encrypted format, it might be legacy plain text
    if (!hash.includes(':')) return hash

    if (!ENCRYPTION_KEY) {
        console.error('Decryption failed: ENCRYPTION_KEY is missing in environment variables.')
        return hash // Fallback to raw hash so we don't break UI for legacy data
    }

    try {
        const [iv, authTag, encrypted] = hash.split(':')
        if (!iv || !authTag || !encrypted) return hash

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), Buffer.from(iv, 'hex'))
        decipher.setAuthTag(Buffer.from(authTag, 'hex'))
        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
    } catch (error) {
        // If decryption fails (e.g. wrong key), return as is to avoid breaking UI for unencrypted fields
        return hash
    }
}
