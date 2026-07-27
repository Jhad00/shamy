// src/api/Transfer.js

const axios = require('axios');
const ShamCrypto = require('../Crypto');
const { API_BASE } = require('../Constants');
const crypto = require('crypto');

class Transfer {
    constructor(client) {
        // Store main client instance
        this.client = client;
    }

    // Resolve account details (Name, Type, Creation Date) by its address/code
    async resolveAccount(addressCode) {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            // Build payload. We assume the parameter is named 'address' 
            // and we include the accessToken as required by ShamCash security
            let payload = { 
                address: addressCode,
                accessToken: this.client.accessToken 
            }; 
            
            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

            let response = await axios.post(`${API_BASE}/api/Account/getAccountByAddress`, encryptedPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'lang': 'ar',
                    'e': 'true', 
                    'Authorization': `Bearer ${this.client.token}` 
                }
            });

            let result = response.data;

            if (result.succeeded && result.data && result.data.encData) {
                const decryptedStr = ShamCrypto.decryptAESResponse(result.data.encData, this.client.clientKey);
                return JSON.parse(decryptedStr);
            }

            return result;

        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Request Error: ${error.message}`);
        }
    }
    // execute a new money transfer
    async executeTransaction(peerAccount, amount, currencyId, note = "", pin = null) {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            // draft payload for transaction
            let payload = {
                accessToken: this.client.accessToken,
                ReceiveKey: peerAccount,
                UniqueKey: crypto.randomUUID(),
                amount: amount, 
                currencyId: currencyId,
                note: note
            };

            // append pin if the system requires transaction confirmation
            if (pin) payload.pin = pin;

            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

            let response = await axios.post(`${API_BASE}/api/Transaction/new`, encryptedPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'lang': 'ar',
                    'e': 'true',
                    'Authorization': `Bearer ${this.client.token}`
                }
            });

            let result = response.data;

            // handle encrypted success response
            if (result.succeeded && result.data && result.data.encData) {
                const decryptedStr = ShamCrypto.decryptAESResponse(result.data.encData, this.client.clientKey);
                return JSON.parse(decryptedStr);
            }

            return result;

        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Request Error: ${error.message}`);
        }
    }
}

module.exports = Transfer;