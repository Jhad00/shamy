// src/api/Account.js

const axios = require('axios');
const qrcode = require('qrcode-terminal');
const ShamCrypto = require('../Crypto');
const { API_BASE } = require('../Constants');

class Account {
    constructor(client) {
        this.client = client;
    }

    // 1. Fetch logged-in user's full profile (details + wallet settings)
    async getMyProfile() {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            let payload = { accessToken: this.client.accessToken };
            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);
            let headers = {
                'Content-Type': 'application/json',
                'lang': 'ar',
                'e': 'true',
                'Authorization': `Bearer ${this.client.token}`
            };

            // fetch profile, settings, and personal info concurrently
            const [profileRes, settingsRes, personalRes] = await Promise.all([
                axios.post(`${API_BASE}/api/Account/myProfile`, encryptedPayload, { headers }),
                axios.post(`${API_BASE}/api/Account/settings`, encryptedPayload, { headers }),
                axios.post(`${API_BASE}/api/PersonalAccount/get`, encryptedPayload, { headers })
            ]);

            let finalProfile = {};

            // parse profile data
            if (profileRes.data.succeeded && profileRes.data.data && profileRes.data.data.encData) {
                let decProfile = ShamCrypto.decryptAESResponse(profileRes.data.data.encData, this.client.clientKey);
                let rawProfile = JSON.parse(decProfile);
                if (Array.isArray(rawProfile) && rawProfile.length > 0) {
                    finalProfile.name = rawProfile[0].name;
                    finalProfile.phone = rawProfile[0].email; // fix backend keys mapping
                    finalProfile.email = rawProfile[0].phone_number;
                }
            }

            // parse settings data (address, account number)
            if (settingsRes.data.succeeded && settingsRes.data.data && settingsRes.data.data.encData) {
                let decSettings = ShamCrypto.decryptAESResponse(settingsRes.data.data.encData, this.client.clientKey);
                let rawSettings = JSON.parse(decSettings);
                finalProfile.address = rawSettings.address;
                finalProfile.accountNumber = rawSettings.accountNumber;
            }

            // parse and format personal details for devs
            if (personalRes.data.succeeded && personalRes.data.data && personalRes.data.data.encData) {
                let decPersonal = ShamCrypto.decryptAESResponse(personalRes.data.data.encData, this.client.clientKey);
                let rawPersonal = JSON.parse(decPersonal);
                
                // core identity
                finalProfile.isVerified = rawPersonal.isVerified;
                finalProfile.nationalId = rawPersonal.nationalId;
                finalProfile.birthdate = rawPersonal.personalBirthdate;
                finalProfile.gender = rawPersonal.personalGender;
                finalProfile.userType = rawPersonal.userType;
                
                // structured name
                finalProfile.fullName = {
                    first: rawPersonal.personalFirstName,
                    middle: rawPersonal.personalMiddleName,
                    last: rawPersonal.personalLastName
                };

                // human-readable location
                finalProfile.location = {
                    governorate: rawPersonal.governorateName,
                    street: rawPersonal.addressStreet,
                    building: rawPersonal.addressBuilding || null
                };
            }

            return finalProfile;

        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Request Error: ${error.message}`);
        }
    }

    // 2. Fetch user's saved favorite accounts
    async getFavorites() {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            let payload = { accessToken: this.client.accessToken }; 
            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

            let response = await axios.post(`${API_BASE}/api/AccountFavorites/all`, encryptedPayload, {
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

    // 3. Fetch account balances for all currencies
    async getBalances() {
        if (!this.client.token || !this.client.clientKey || !this.client.accessToken) {
            throw new Error("Client not authenticated. Call initialize() first.");
        }

        try {
            let payload = { accessToken: this.client.accessToken }; 
            let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

            let response = await axios.post(`${API_BASE}/api/Account/balances`, encryptedPayload, {
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
                let rawData = JSON.parse(decryptedStr);

                // Normalize data: Inject currency names based on ShamCash frontend logic
                if (rawData.balances && Array.isArray(rawData.balances)) {
                    rawData.balances = rawData.balances.map(item => {
                        let name = '';
                        switch (item.currencyId) {
                            case 1: name = 'USD'; break;
                            case 2: name = 'SYP'; break;
                            case 3: name = 'EUR'; break;
                            default: name = 'UNKNOWN';
                        }
                        return { ...item, currencyName: name };
                    });
                }

                return rawData;
            }
            return result;
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Request Error: ${error.message}`);
        }
    }

    // 4. Generate and display a QR Code in terminal for receiving money
    async displayReceiveQR() {
        try {
            // fetch profile to get the address
            const profile = await this.getMyProfile();
            const address = profile.address;

            if (!address) {
                throw new Error("Could not retrieve the account address.");
            }
            
            // pure qr generation without hardcoded logs
            qrcode.generate(address, { small: true });

            // return the address so the dev can use or print it
            return address;
        } catch (error) {
            throw new Error(`QR Generation Error: ${error.message}`);
        }
    }
}

module.exports = Account;