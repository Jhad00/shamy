// src/Client.js

const axios = require('axios');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ShamCrypto = require('./Crypto');
const { API_BASE, STATIC_AES_KEY } = require('./Constants');


// import api managers
const Account = require('./api/Account');
const Transfer = require('./api/Transfer');
const History = require('./api/History');
const Wallets = require('./api/Wallets');

class ShamClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.sessionId = null;
        this.clientKey = null;
        this.pollInterval = null;
        this.accessToken = null; 
        this.token = null;

        // setup session dir (default or passed in options)
        this.sessionDir = options.sessionDir || path.join(process.cwd(), 'shamy_session');
        this.sessionFile = path.join(this.sessionDir, 'session.json');

        // init managers
        this.account = new Account(this);
        this.transfer = new Transfer(this);
        this.history = new History(this);
        this.wallets = new Wallets(this);
    }

    // load session or trigger qr auth
    async initialize() {
        if (this._loadSession()) {
            this.emit('connecting', 'Session file found. Loading credentials...');
            this.emit('ready', {
                message: 'Restored from saved session!',
                token: this.token,
                accessToken: this.accessToken
            });
            // check token expiration here later
        } else {
            await this.connect();
        }
    }

    // save session data locally
    _saveSession() {
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
        
        const sessionData = {
            loginTime: new Date().toISOString(),
            accessToken: this.accessToken,
            token: this.token,
            clientKey: this.clientKey // needed for future decryption
        };

        fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 4));
        this.emit('info', `Session saved to directory: ${this.sessionDir}`);
    }

    // read session data if exists
    _loadSession() {
        if (fs.existsSync(this.sessionFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
                this.accessToken = data.accessToken;
                this.token = data.token;
                this.clientKey = data.clientKey;
                return true;
            } catch (err) {
                this.emit('error', `Failed to parse session file: ${err.message}`);
                return false;
            }
        }
        return false;
    }

    // start qr login flow
    async connect() {
        this.emit('connecting', 'Generating secure session...');

        try {
            this.sessionId = crypto.randomUUID();
            this.clientKey = ShamCrypto.generateRandomKey();

            let encryptedSessionId = ShamCrypto.encryptAES(this.sessionId, STATIC_AES_KEY);
            let encryptedClientKey = ShamCrypto.encryptAES(this.clientKey, STATIC_AES_KEY);

            // build payload exactly like official web client
            let qrPayload = JSON.stringify({
                sessionId: encryptedSessionId + "#XXX", 
                publicKey: encryptedClientKey,
                infoDevice: {
                    deviceName: "Shamy CLI",
                    os: "Termux/Linux",
                    browser: "Node.js"
                }
            });

            this.emit('qr', qrPayload);
            qrcode.generate(qrPayload, { small: true });

            this._startPolling();

        } catch (error) {
            this.emit('error', `Initialization failed: ${error.message}`);
        }
    }

    // check api every 5s for qr scan
    _startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                let payload = { sessionId: this.sessionId };
                let encryptedPayload = ShamCrypto.prepareApiPayload(payload);

                let response = await axios.post(`${API_BASE}/api/Session/check`, encryptedPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'lang': 'ar',
                        'e': 'true'
                    }
                });

                let result = response.data;

                // 1231 means waiting for user scan
                if (result.result === 1231) return; 

                if (result.succeeded) {
                    clearInterval(this.pollInterval);
                    
                    let sessionData = {};
                    if (result.data && result.data.encData) {
                        try {
                            const decryptedStr = ShamCrypto.decryptAESResponse(result.data.encData, this.clientKey);
                            sessionData = JSON.parse(decryptedStr);
                        } catch (decErr) {
                            return this.emit('error', `Decryption failed: ${decErr.message}`);
                        }
                    }

                    this.accessToken = sessionData.accessToken;
                    this.token = sessionData.token;

                    this._saveSession();

                    this.emit('ready', {
                        message: 'Authentication Successful!',
                        token: this.token,
                        accessToken: this.accessToken
                    });
                }
            } catch (error) {
                if (error.response && error.response.status !== 400) {
                    this.emit('error', `Polling Error: ${error.message}`);
                }
            }
        }, 5000);
    }
}

module.exports = ShamClient;