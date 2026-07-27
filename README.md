# @jhad-dev/shamy

Automated QR authentication and payment verification library for ShamCash.

This unofficial library allows developers to integrate ShamCash services directly into Node.js applications, with features such as automated session management, real-time transaction monitoring, and secure API interactions.

---

## Features

- QR-based authentication flow
- Automatic session saving and loading
- Real-time transaction monitoring
- Account profile and balance retrieval
- Favorite accounts retrieval
- Receive QR generation
- Account resolution before transfer
- Transaction execution support
- Transaction history with filters
- Cash-in to external wallets (Syriatel / MTN)
- Syriatel mobile recharge (prepaid / postpaid)
- Event-based architecture using `EventEmitter`

---

## Installation

Install the package via npm:

```bash
npm install @jhad-dev/shamy
```

---

## Quick Start

Initialize the client and listen for events. On the first run, a QR code will be generated in your terminal. Scan it using the official ShamCash app to authenticate. Subsequent runs will use the saved session.

```js
const { ShamClient } = require('@jhad-dev/shamy');

// Initialize client with custom session directory (optional)
const client = new ShamClient({
    sessionDir: './my_sessions' // Defaults to process.cwd()/shamy_session
});

// Event listeners
client.on('qr', (qrPayload) => {
    console.log('Scan the QR code displayed above in your ShamCash app.');
});

client.on('ready', async (data) => {
    console.log('Client is ready!', data.message);

    // Get account balances
    const balances = await client.account.getBalances();
    console.log(balances);
});

client.on('error', (err) => {
    console.error('Error:', err);
});

// Start the client
client.initialize();
```

---

## API Reference

The `ShamClient` exposes four main modules:

- `account`
- `transfer`
- `history`
- `wallets`

---

## Authentication and Session Management

### `client.initialize()`

Starts the client.

- If a valid session file (`session.json`) is found in the `sessionDir`, it loads the saved credentials.
- Otherwise, it starts the QR authentication flow and polls the server until the QR is scanned.

---

## account

Manage account details and balances.

### `client.account.getMyProfile()`

Fetches the logged-in user's full profile, including:

- personal details
- verification status
- registered address

### `client.account.getBalances()`

Retrieves the current balance for all supported currencies, mapping currency IDs to readable names such as:

- USD
- SYP
- EUR

### `client.account.getFavorites()`

Returns the user's saved favorite accounts.

### `client.account.displayReceiveQR()`

Retrieves the user's account address and generates a QR code in the terminal for receiving payments.

**Returns:** raw account address string

---

## transfer

Handle peer-to-peer money transfers.

### `client.transfer.resolveAccount(addressCode)`

Resolves and returns account details associated with a specific ShamCash address or code.

Typical returned data may include:

- name
- account type
- other account metadata

### `client.transfer.executeTransaction(peerAccount, amount, currencyId, note = "", pin = null)`

Executes a new money transfer.

#### Parameters

- `peerAccount`  
  The recipient's ShamCash address

- `amount`  
  Amount to transfer

- `currencyId`  
  Currency identifier:
  - `1` = USD
  - `2` = SYP
  - `3` = EUR

- `note`  
  Optional transaction note

- `pin`  
  Optional transaction PIN if required by user settings

---

## history

Retrieve transaction logs and monitor incoming payments.

### `client.history.getLogs(page = 1, limit = 10, filters = {})`

Fetches transaction history.

#### Supported filters

- `startDate`
- `endDate`
- `currencyId`
- `peerAccount`
- `searchTerm`
- `moneyMin`
- `moneyMax`
- `tranID`

### `client.history.startMonitoring(intervalMs = 10000)`

Starts a polling loop that checks for new transactions.

- Default interval: `10000 ms` (10 seconds)
- When a new transaction is detected, the client formats the data and emits a `transaction` event

### `client.history.stopMonitoring()`

Stops the active transaction monitor.

---

## wallets

Handle cash-in transfers to external wallets and mobile recharges through the bank endpoints.

### `client.wallets.cashIn(walletType, phoneNumber, amount, pin = null)`

Sends a cash-in transfer to an external wallet.

#### Parameters

- `walletType`  
  Target wallet, either `'syriatel'` or `'mtn'`

- `phoneNumber`  
  Destination phone number

- `amount`  
  Amount to send

- `pin`  
  Optional transaction PIN if required by user settings

### `client.wallets.rechargeSyriatel(lineType, phoneNumber, amount, pin = null)`

Recharges a Syriatel mobile line.

#### Parameters

- `lineType`  
  Line type, either `'prepaid'` or `'postpaid'`

- `phoneNumber`  
  Destination phone number

- `amount`  
  Amount to recharge

- `pin`  
  Optional transaction PIN if required by user settings

---

## Events

`ShamClient` extends `EventEmitter` and emits the following events:

### `connecting`

Fired when the client is:

- loading existing sessions
- generating a secure connection payload

### `ready`

Fired when authentication succeeds, either by:

- saved session
- fresh QR scan

### `qr`

Fired with the raw QR payload when a new login is required.

### `transaction`

Fired by `history.startMonitoring()` when a new incoming or outgoing transaction is detected.

Contains formatted transaction details.

### `info`

Fired for informational logs, such as:

- monitor started
- monitor stopped
- session saved

### `error`

Fired when API, network, or processing errors occur.

---

## Example: Monitor Transactions

```js
const { ShamClient } = require('@jhad-dev/shamy');

const client = new ShamClient();

client.on('ready', async () => {
    console.log('Authenticated successfully.');
    client.history.startMonitoring(10000);
});

client.on('transaction', (tx) => {
    console.log('New transaction detected:', tx);
});

client.on('error', (err) => {
    console.error('Error:', err);
});

client.initialize();
```

---

## License

This project is licensed under the MIT License.

---

## Disclaimer

This is an unofficial library.

Use it at your own risk. The authors are not responsible for any financial losses, account restrictions, or account suspensions resulting from the use of this software.

---

## Source Code

Project repository and issue tracker:

https://github.com/Jhad00/shamy

---

## Author & Contact

Jhad

- Email: dnsdbs@proton.me
