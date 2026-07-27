// src/api/Wallets.js

const axios = require('axios');
const ShamCrypto = require('../Crypto');
const { BANK_BASE } = require('../Constants');

class Wallets {
    constructor(client) {
        this.client = client;
    }

    // handle cash-in transfers to external wallets (syriatel/mtn)
    async cashIn(walletType, phoneNumber, amount, pin = null) {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        // route to appropriate bank endpoint
        let endpoint = '';
        const target = walletType.toLowerCase();
        
        if (target === 'syriatel') endpoint = `${BANK_BASE}/api/SyriatelWallet/cashIn`;
        else if (target === 'mtn') endpoint = `${BANK_BASE}/api/MtnWallet/cashIn`;
        else throw new Error("Invalid wallet type. Supported: 'syriatel', 'mtn'");

        try {
            // exact payload keys expected by bank endpoint (case-sensitive)
            let payload = {
                accessToken: this.client.accessToken,
                PhoneNumber: phoneNumber, 
                amount: amount
            };

            if (pin) payload.pin = pin;

            // Bank endpoints strictly accept 'encData' only, without 'aesKey'
            // We bypass prepareApiPayload and encrypt directly using the session's clientKey
            let payloadStr = JSON.stringify(payload);
            let encryptedPayload = {
                encData: ShamCrypto.encryptAES(payloadStr, this.client.clientKey)
            };

            let response = await axios.post(endpoint, encryptedPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'lang': 'ar',
                    'e': 'true',
                    'Authorization': `Bearer ${this.client.token}`
                }
            });

            let result = response.data;

            // decrypt successful encrypted responses
            if (result.succeeded && result.data && result.data.encData) {
                const decryptedStr = ShamCrypto.decryptAESResponse(result.data.encData, this.client.clientKey);
                return JSON.parse(decryptedStr);
            }

            // fallback to raw response if unencrypted or failed (e.g., error 1640)
            return result;
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Request Error: ${error.message}`);
        }
    }

    // handle syriatel mobile balance top-up (units/recharge)
    async rechargeSyriatel(lineType, phoneNumber, amount, pin = null) {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        let endpoint = '';
        const type = lineType.toLowerCase(); // 'prepaid' or 'postpaid'

        // set endpoint based on line type (using new dynamic endpoints)
        if (type === 'prepaid') {
            endpoint = `${BANK_BASE}/api/SyriatelWallet/dynamicRecharge`;
        } else if (type === 'postpaid') {
            endpoint = `${BANK_BASE}/api/SyriatelWallet/chargePostPaid`;
        } else {
            throw new Error("Invalid line type. Supported: 'prepaid', 'postpaid'");
        }

        try {
            // exact payload keys expected by bank endpoint (case-sensitive)
            let payload = {
                accessToken: this.client.accessToken,
                PhoneNumber: phoneNumber, 
                amount: amount
            };

            if (pin) payload.pin = pin;

            // bank endpoints strictly accept 'encData' only
            let payloadStr = JSON.stringify(payload);
            let encryptedPayload = {
                encData: ShamCrypto.encryptAES(payloadStr, this.client.clientKey)
            };

            let response = await axios.post(endpoint, encryptedPayload, {
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
}

module.exports = Wallets;
