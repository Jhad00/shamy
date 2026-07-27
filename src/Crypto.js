// src/Crypto.js

const forge = require('node-forge');
const crypto = require('crypto');
const { RSA_PUBLIC_KEY } = require('./Constants');

class ShamCrypto {
    static generateRandomKey() {
        let bytes = forge.random.getBytesSync(16);
        let b64 = forge.util.encode64(bytes);
        return b64.replace(/\+/g, "-").replace(/\//g, "_");
    }

    static encryptAES(text, key) {
        let iv = forge.random.getBytesSync(12);
        let cipher = forge.cipher.createCipher('AES-GCM', key);
        cipher.start({ iv: iv });
        cipher.update(forge.util.createBuffer(text, 'utf8'));
        cipher.finish();

        let ciphertext = cipher.output.getBytes();
        let tag = cipher.mode.tag.getBytes();

        let encData = forge.util.encode64(ciphertext + tag);
        let encodedIv = forge.util.encode64(iv);

        return `${encData}.${encodedIv}`;
    }

    static encryptRSA(aesKeyBase64) {
        let publicKey = forge.pki.publicKeyFromPem(RSA_PUBLIC_KEY);
        let encrypted = publicKey.encrypt(aesKeyBase64, 'RSAES-PKCS1-V1_5');
        return forge.util.encode64(encrypted);
    }

    static prepareApiPayload(dataObj) {
        let payloadStr = JSON.stringify(dataObj);
        let randomAesKey = this.generateRandomKey();
        
        return {
            encData: this.encryptAES(payloadStr, randomAesKey),
            aesKey: this.encryptRSA(randomAesKey)
        };
    }

    static decryptAESResponse(encDataPayload, clientKey) {
        const parts = encDataPayload.split('.');
        const encryptedData = Buffer.from(parts[0], 'base64');
        const iv = Buffer.from(parts[1], 'base64');
        
        const authTag = encryptedData.subarray(-16);
        const ciphertext = encryptedData.subarray(0, -16);

        const decipher = crypto.createDecipheriv('aes-192-gcm', Buffer.from(clientKey, 'utf8'), iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return decrypted.toString('utf8');
    }
}

module.exports = ShamCrypto;