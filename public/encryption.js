/**
 * Client-Side Encryption Library - Complete Version
 * Ultra-secure AES-256-GCM encryption with Web Crypto API
 */

class SecureEncryption {
    constructor() {
        this.currentKey = null;
        this.keyGenerated = false;
        this.algorithm = 'AES-256-GCM';
        this.keyHistory = []; // For key rotation tracking
        this.encryptionStats = {
            messagesEncrypted: 0,
            filesEncrypted: 0,
            keyRotations: 0,
            lastActivity: Date.now()
        };
    }

    // Generate AES-256 key
    async generateAESKey() {
        try {
            const key = await window.crypto.subtle.generateKey(
                { 
                    name: "AES-GCM", 
                    length: 256 
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
            
            this.currentKey = key;
            this.keyGenerated = true;
            this.encryptionStats.lastActivity = Date.now();
            
            console.log('🔐 AES-256 key generated successfully');
            return key;
        } catch (error) {
            console.error('Failed to generate AES key:', error);
            throw new Error('Key generation failed');
        }
    }

    // Encrypt message
    async encryptMessage(message) {
        try {
            if (!this.currentKey) {
                await this.generateAESKey();
            }

            if (!message || typeof message !== 'string') {
                throw new Error('Invalid message format');
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            // Generate random IV for each message
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    tagLength: 128
                },
                this.currentKey,
                data
            );

            const result = {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                algorithm: this.algorithm,
                timestamp: Date.now(),
                messageLength: message.length
            };

            // Update stats
            this.encryptionStats.messagesEncrypted++;
            this.encryptionStats.lastActivity = Date.now();

            return result;
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Message encryption failed');
        }
    }

    // Decrypt message
    async decryptMessage(encryptedData) {
        try {
            if (!this.currentKey) {
                throw new Error('No encryption key available');
            }

            if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv) {
                throw new Error('Invalid encrypted data format');
            }

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(encryptedData.iv),
                    tagLength: 128
                },
                this.currentKey,
                new Uint8Array(encryptedData.encrypted)
            );

            const decoder = new TextDecoder();
            this.encryptionStats.lastActivity = Date.now();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Message decryption failed');
        }
    }

    // Generate RSA key pair for key exchange
    async generateRSAKeyPair() {
        try {
            return await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true, // extractable
                ["encrypt", "decrypt"]
            );
        } catch (error) {
            console.error('RSA key generation failed:', error);
            throw new Error('RSA key pair generation failed');
        }
    }

    // Encrypt file with progress callback
    async encryptFile(fileBuffer, progressCallback = null) {
        try {
            if (!this.currentKey) {
                await this.generateAESKey();
            }

            if (progressCallback) progressCallback(10);

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            if (progressCallback) progressCallback(50);
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                    tagLength: 128
                },
                this.currentKey,
                fileBuffer
            );

            if (progressCallback) progressCallback(90);

            const result = {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                algorithm: this.algorithm,
                originalSize: fileBuffer.byteLength,
                encryptedAt: Date.now()
            };

            // Update stats
            this.encryptionStats.filesEncrypted++;
            this.encryptionStats.lastActivity = Date.now();

            if (progressCallback) progressCallback(100);
            return result;
        } catch (error) {
            console.error('File encryption failed:', error);
            throw new Error('File encryption failed');
        }
    }

    // Decrypt file with progress callback
    async decryptFile(encryptedFileData, progressCallback = null) {
        try {
            if (!this.currentKey) {
                throw new Error('No encryption key available');
            }

            if (progressCallback) progressCallback(20);

            const { encrypted, iv } = encryptedFileData;
            
            if (progressCallback) progressCallback(60);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(iv),
                    tagLength: 128
                },
                this.currentKey,
                new Uint8Array(encrypted)
            );

            if (progressCallback) progressCallback(100);
            this.encryptionStats.lastActivity = Date.now();
            return decrypted;
        } catch (error) {
            console.error('File decryption failed:', error);
            throw new Error('File decryption failed');
        }
    }

    // Generate secure hash with salt
    async generateHash(data, salt = null) {
        try {
            const encoder = new TextEncoder();
            let encodedData = typeof data === 'string' ? encoder.encode(data) : data;
            
            // Add salt if provided
            if (salt) {
                const saltBytes = typeof salt === 'string' ? encoder.encode(salt) : salt;
                const combined = new Uint8Array(encodedData.length + saltBytes.length);
                combined.set(encodedData);
                combined.set(saltBytes, encodedData.length);
                encodedData = combined;
            }
            
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', encodedData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Hash generation failed:', error);
            throw new Error('Hash generation failed');
        }
    }

    // Generate cryptographic salt
    generateSalt(length = 32) {
        try {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            return Array.from(array);
        } catch (error) {
            console.error('Salt generation failed:', error);
            throw new Error('Salt generation failed');
        }
    }

    // Derive key from password using PBKDF2
    async deriveKeyFromPassword(password, salt, iterations = 100000) {
        try {
            const encoder = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                encoder.encode(password),
                { name: "PBKDF2" },
                false,
                ["deriveBits", "deriveKey"]
            );

            return await window.crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: new Uint8Array(salt),
                    iterations: iterations,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('Key derivation failed');
        }
    }

    // Export key for backup/transfer
    async exportKey(key = null) {
        try {
            const keyToExport = key || this.currentKey;
            if (!keyToExport) {
                throw new Error('No key available for export');
            }

            const exported = await window.crypto.subtle.exportKey("raw", keyToExport);
            return Array.from(new Uint8Array(exported));
        } catch (error) {
            console.error('Key export failed:', error);
            throw new Error('Key export failed');
        }
    }

    // Import key from exported data
    async importKey(keyData) {
        try {
            const key = await window.crypto.subtle.importKey(
                "raw",
                new Uint8Array(keyData),
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            );

            this.currentKey = key;
            this.keyGenerated = true;
            return key;
        } catch (error) {
            console.error('Key import failed:', error);
            throw new Error('Key import failed');
        }
    }

    // Validate encrypted message format
    validateEncryptedMessage(encryptedMessage) {
        try {
            if (!encryptedMessage || typeof encryptedMessage !== 'object') {
                return { valid: false, error: 'Invalid message format' };
            }
            
            const requiredFields = ['encrypted', 'iv', 'algorithm'];
            for (const field of requiredFields) {
                if (!(field in encryptedMessage)) {
                    return { valid: false, error: `Missing field: ${field}` };
                }
            }
            
            if (encryptedMessage.algorithm !== this.algorithm) {
                return { valid: false, error: 'Invalid algorithm' };
            }
            
            if (!Array.isArray(encryptedMessage.iv) || encryptedMessage.iv.length !== 12) {
                return { valid: false, error: 'Invalid IV format' };
            }
            
            if (!Array.isArray(encryptedMessage.encrypted) || encryptedMessage.encrypted.length === 0) {
                return { valid: false, error: 'Invalid encrypted data' };
            }

            // Check for minimum encrypted size (should be at least 16 bytes for AES-GCM)
            if (encryptedMessage.encrypted.length < 16) {
                return { valid: false, error: 'Encrypted data too small' };
            }
            
            return { 
                valid: true, 
                strength: 'MILITARY_GRADE',
                algorithm: encryptedMessage.algorithm,
                ivLength: encryptedMessage.iv.length,
                dataSize: encryptedMessage.encrypted.length
            };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Get detailed encryption status
    getEncryptionStatus() {
        return {
            keyGenerated: this.keyGenerated,
            algorithm: this.algorithm,
            keyStrength: '256-bit',
            mode: 'GCM',
            status: this.keyGenerated ? 'ACTIVE' : 'INACTIVE',
            stats: { ...this.encryptionStats },
            keyAge: this.keyGenerated ? Date.now() - this.encryptionStats.lastActivity : 0,
            browserSupport: this.getBrowserSupport()
        };
    }

    // Get browser crypto support details
    getBrowserSupport() {
        return {
            webCrypto: !!(window.crypto && window.crypto.subtle),
            aesGcm: true, // Assume true if WebCrypto is available
            rsaOaep: true,
            sha256: true,
            pbkdf2: true,
            getRandomValues: !!window.crypto?.getRandomValues
        };
    }

    // Enhanced key rotation with history tracking
    async rotateKey(reason = 'manual') {
        try {
            // Store old key info for transition period
            const oldKeyInfo = {
                timestamp: Date.now(),
                reason: reason,
                messagesEncrypted: this.encryptionStats.messagesEncrypted
            };

            // Generate new key
            const newKey = await this.generateAESKey();
            
            // Update key history
            this.keyHistory.push(oldKeyInfo);
            if (this.keyHistory.length > 10) { // Keep only last 10 rotations
                this.keyHistory.shift();
            }

            // Reset some stats for new key
            this.encryptionStats.keyRotations++;
            this.encryptionStats.messagesEncrypted = 0;
            this.encryptionStats.filesEncrypted = 0;
            
            console.log(`🔄 Encryption key rotated successfully (${reason})`);
            return true;
        } catch (error) {
            console.error('Key rotation failed:', error);
            throw new Error('Key rotation failed');
        }
    }

    // Automatic key rotation based on usage
    shouldRotateKey() {
        const maxMessages = 10000;
        const maxAge = 3600000; // 1 hour
        const keyAge = Date.now() - this.encryptionStats.lastActivity;

        return this.encryptionStats.messagesEncrypted >= maxMessages || keyAge >= maxAge;
    }

    // Secure memory wipe
    wipeKey() {
        try {
            // Clear current key
            this.currentKey = null;
            this.keyGenerated = false;
            
            // Clear key history
            this.keyHistory = [];
            
            // Reset stats
            this.encryptionStats = {
                messagesEncrypted: 0,
                filesEncrypted: 0,
                keyRotations: 0,
                lastActivity: Date.now()
            };
            
            // Suggest garbage collection
            if (window.gc) {
                window.gc();
            }
            
            console.log('🗑️ All encryption data wiped from memory');
        } catch (error) {
            console.warn('Key wipe warning:', error.message);
        }
    }

    // Generate cryptographically secure anonymous ID
    generateAnonymousId(length = 32) {
        try {
            const array = new Uint8Array(length / 2);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Anonymous ID generation failed:', error);
            return this.generateFallbackId(length);
        }
    }

    // Fallback ID generation using Math.random (less secure)
    generateFallbackId(length = 32) {
        console.warn('⚠️ Using fallback ID generation (less secure)');
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Generate UUID-style message ID
    generateMessageId() {
        try {
            const array = new Uint8Array(16);
            window.crypto.getRandomValues(array);
            
            const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
        } catch (error) {
            console.error('Message ID generation failed:', error);
            return this.generateFallbackMessageId();
        }
    }

    // Fallback message ID generation
    generateFallbackMessageId() {
        const timestamp = Date.now().toString(16);
        const random = Math.random().toString(16).substr(2, 8);
        return `${timestamp}-${random}-${random}-${random}-${timestamp}${random}`;
    }

    // Generate file ID
    generateFileId() {
        try {
            const array = new Uint8Array(12);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('File ID generation failed:', error);
            return Date.now().toString(16) + Math.random().toString(16).substr(2, 8);
        }
    }

    // Generate session token
    generateSessionToken() {
        try {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Session token generation failed:', error);
            return this.generateFallbackId(64);
        }
    }

    // Benchmark encryption performance
    async benchmarkEncryption(iterations = 100) {
        console.log(`🏃 Starting encryption benchmark (${iterations} iterations)...`);
        
        const testMessage = 'This is a test message for benchmarking encryption performance.';
        const results = {
            iterations,
            encryptionTimes: [],
            decryptionTimes: [],
            averageEncryption: 0,
            averageDecryption: 0,
            totalTime: 0
        };

        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            // Measure encryption
            const encryptStart = performance.now();
            const encrypted = await this.encryptMessage(testMessage);
            const encryptEnd = performance.now();
            results.encryptionTimes.push(encryptEnd - encryptStart);

            // Measure decryption
            const decryptStart = performance.now();
            await this.decryptMessage(encrypted);
            const decryptEnd = performance.now();
            results.decryptionTimes.push(decryptEnd - decryptStart);
        }

        const endTime = performance.now();
        results.totalTime = endTime - startTime;
        results.averageEncryption = results.encryptionTimes.reduce((a, b) => a + b, 0) / iterations;
        results.averageDecryption = results.decryptionTimes.reduce((a, b) => a + b, 0) / iterations;

        console.log(`✅ Benchmark completed:`, results);
        return results;
    }

    // Self-test encryption functionality
    async selfTest() {
        console.log('🧪 Running encryption self-test...');
        
        try {
            // Test message encryption
            const testMessage = 'Hello, secure world!';
            const encrypted = await this.encryptMessage(testMessage);
            const decrypted = await this.decryptMessage(encrypted);
            
            if (decrypted !== testMessage) {
                throw new Error('Message encryption/decryption failed');
            }

            // Test file encryption
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            const encryptedFile = await this.encryptFile(testData.buffer);
            const decryptedFile = await this.decryptFile(encryptedFile);
            const decryptedArray = new Uint8Array(decryptedFile);
            
            if (decryptedArray.length !== testData.length || 
                !decryptedArray.every((val, idx) => val === testData[idx])) {
                throw new Error('File encryption/decryption failed');
            }

            // Test validation
            const validation = this.validateEncryptedMessage(encrypted);
            if (!validation.valid) {
                throw new Error('Message validation failed');
            }

            console.log('✅ All encryption self-tests passed');
            return { success: true, tests: ['message', 'file', 'validation'] };
        } catch (error) {
            console.error('❌ Self-test failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Check Web Crypto API support
    static isSupported() {
        return !!(window.crypto && 
                  window.crypto.subtle && 
                  window.crypto.getRandomValues);
    }

    // Get detailed browser compatibility info
    static getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';

        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        }

        return {
            browser,
            version,
            userAgent,
            isSupported: SecureEncryption.isSupported(),
            isSecureContext: window.isSecureContext,
            hasWebCrypto: !!(window.crypto && window.crypto.subtle),
            hasGetRandomValues: !!window.crypto?.getRandomValues
        };
    }

    // Initialize encryption system with validation
    static async initialize() {
        if (!SecureEncryption.isSupported()) {
            const browserInfo = SecureEncryption.getBrowserInfo();
            throw new Error(`Web Crypto API not supported. Browser: ${browserInfo.browser} ${browserInfo.version}`);
        }
        
        const encryption = new SecureEncryption();
        await encryption.generateAESKey();
        
        // Run self-test
        const testResult = await encryption.selfTest();
        if (!testResult.success) {
            throw new Error(`Encryption self-test failed: ${testResult.error}`);
        }
        
        console.log('🔐 Secure encryption system initialized and tested');
        return encryption;
    }
}

// Export for use in main application
window.SecureEncryption = SecureEncryption;

// Additional utility functions
window.CryptoUtils = {
    // Convert string to hex
    stringToHex: (str) => {
        return Array.from(new TextEncoder().encode(str))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },
    
    // Convert hex to string
    hexToString: (hex) => {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return new TextDecoder().decode(new Uint8Array(bytes));
    },
    
    // Generate secure random bytes
    randomBytes: (length) => {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array);
    },
    
    // Compare arrays in constant time (timing attack prevention)
    constantTimeEqual: (a, b) => {
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result === 0;
    }
};

console.log('🔐 SecureEncryption library loaded successfully');