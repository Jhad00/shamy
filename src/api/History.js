// src/api/History.js

const axios = require('axios');
const ShamCrypto = require('../Crypto');
const { API_BASE } = require('../Constants');

class History {
    constructor(client) {
        // Store main client instance
        this.client = client;
        
        // tracking state for monitor
        this.knownTxIds = new Set();
        this.monitorInterval = null;
    }

    // Fetch transaction history with full filter support
    async getLogs(page = 1, limit = 10, filters = {}) {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];

            // Build payload exactly as the frontend React app does
            let payload = { 
                accessToken: this.client.accessToken,
                limit: limit,                // Number of items per page
                pageSize: page,              // Page number (ShamCash dev typo in variable naming)
                startDate: filters.startDate || "2000-01-01", // Default to 2000 to get ALL history
                endDate: filters.endDate || today,
                currencyId: filters.currencyId || null,
                peerAccount: filters.peerAccount || null,
                searchTerm: filters.searchTerm || null,
                moneyMin: filters.moneyMin || null,
                moneyMax: filters.moneyMax || null,
                tranID: filters.tranID || null
            }; 
            
            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

            let response = await axios.post(`${API_BASE}/api/Transaction/history-logs`, encryptedPayload, {
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
    
    // start polling for new transactions every X ms
    async startMonitoring(intervalMs = 10000) {
        if (this.monitorInterval) return; // already running

        this.client.emit('info', 'Transaction monitor started...');

        try {
            // preload current history so we don't emit old transactions
            let initialLogs = await this.getLogs(1, 10);
            
            // exactly target the 'log' array based on actual API response
            let dataArray = initialLogs.log || []; 

            if (Array.isArray(dataArray)) {
                dataArray.forEach(tx => {
                    if (tx.tranId) this.knownTxIds.add(tx.tranId);
                });
            }
        } catch (err) {
            this.client.emit('error', 'Monitor failed to preload history.');
        }

        // start polling loop
        this.monitorInterval = setInterval(async () => {
            try {
                let res = await this.getLogs(1, 5); // check latest 5
                let dataArray = res.log || []; 

                if (!Array.isArray(dataArray)) return;

                // loop backwards (oldest to newest)
                for (let i = dataArray.length - 1; i >= 0; i--) {
                    let tx = dataArray[i];
                    let txId = tx.tranId;

                    if (txId && !this.knownTxIds.has(txId)) {
                        this.knownTxIds.add(txId);
                        
                        // format transaction for developers
                        let formattedTx = {
                            id: tx.tranId,
                            type: tx.tranKind === 1 ? 'incoming' : (tx.tranKind === 2 ? 'outgoing' : 'unknown'),
                            amount: tx.amount,
                            currency: tx.currencyName,
                            date: tx.tranDate,
                            time: tx.tranTime,
                            peer: {
                                name: tx.peerUserName,
                                address: tx.peerAccountAddress,
                                accountNumber: tx.peerAccountNumber
                            },
                            note: tx.note || null,
                            raw: tx // keep raw data just in case
                        };

                        // emit structured transaction to the main client
                        this.client.emit('transaction', formattedTx);
                    }
                }
            } catch (err) {
                // silent fail on network errors during polling
            }
        }, intervalMs);
    }

    // stop the monitoring loop
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            this.client.emit('info', 'Transaction monitor stopped.');
        }
    }
}

module.exports = History;