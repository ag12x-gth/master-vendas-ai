
import CryptoJS from 'crypto-js';

// GDC Enterprise Layer - Secure Enclave Simulation
// Simulates an air-gapped environment by enforcing AES-256 encryption at rest.
// This ensures that even if the database is compromised, the sensitive data remains secure
// without the specific matching keys, mimicking the physical security of a GDC.

const ENCLAVE_SECRET = process.env.GDC_ENCLAVE_SECRET || 'gdc-master-key-change-in-prod-v1';

export class SecureEnclave {
    /**
     * Encrypts sensitive data using AES-256 (GDC Standard).
     * @param data The plaintext data to encrypt (string or object).
     * @returns The encrypted ciphertext string.
     */
    static encrypt(data: any): string {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        const ciphertext = CryptoJS.AES.encrypt(payload, ENCLAVE_SECRET).toString();
        console.log(`[GDC Enclave] Data encrypted (${ciphertext.length} bytes)`);
        return ciphertext;
    }

    /**
     * Decrypts GDC-protected data.
     * @param ciphertext The encrypted string.
     * @returns The decrypted data (original type).
     */
    static decrypt<T>(ciphertext: string): T {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCLAVE_SECRET);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);

        try {
            return JSON.parse(decryptedStr) as T;
        } catch {
            return decryptedStr as unknown as T;
        }
    }

    /**
     * Processes data within the enclave without exposing it to the outer scope.
     * @param encryptedData
     * @param processor Function to process decrypted data safely.
     */
    static async processSecurely<T, R>(encryptedData: string, processor: (data: T) => Promise<R>): Promise<R> {
        console.log('[GDC Enclave] Secure processing session started');
        const data = this.decrypt<T>(encryptedData);
        const result = await processor(data);
        console.log('[GDC Enclave] Secure processing session ended');
        // In a real GDC, memory would be wiped here.
        return result;
    }
}
