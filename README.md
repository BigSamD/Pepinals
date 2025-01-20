
# Pepinals

A minter and protocol for inscriptions on Pepecoin.

## ⚠️⚠️⚠️ Important ⚠️⚠️⚠️

Use this wallet for inscribing only! Avoid storing pepinals in Pepecoin Core.

Please use a fresh paper wallet to mint to with nothing else in it until a proper wallet for pepinals support becomes available.

This wallet is not meant for storing funds or inscriptions.

## Prerequisites

To use this, you'll need to set up the Pepinals repository, install Node.js on your computer, and connect to an Electrum server.

### Install Node.js

Please head over to [Node.js](https://nodejs.org/en/download) and follow the installation instructions for your operating system.

### Setup Pepinals

#### Clone the Pepinals repository

Use the following commands to clone the repository:

```bash
cd
git clone https://github.com/BigSamD/Pepinals.git
```

#### Install dependencies

Navigate to the `Pepinals` directory and install the required dependencies:

```bash
cd Pepinals
npm install
npm install ./bitcore-lib-pepe
```

#### Configure the environment

Create a `.env` file with the following structure to configure your connection to the Electrum server:

```env
# Set the host and port for the Electrum server
ELECTRUMX_HOST=electrum.pepelum.site
ELECTRUMX_PORT=50002
ELECTRUMX_PROTOCOL=ssl

# Set to "true" if using the testnet
TESTNET=false

# Fee per kB (in satoshis per KB)
FEE_PER_KB=5000000

# Wallet file name (optional, default: .wallet.json)
WALLET=.wallet.json

# Express server port (optional)
SERVER_PORT=3000
```

## Managing Wallet Balance

### Generate a new wallet

To create a new wallet, use the following command:

```bash
node . wallet new
```

This will generate a `.wallet.json` file containing your private key and address. Use this wallet only for minting.

### Sync wallet UTXOs

Sync your wallet with the Electrum server to fetch the UTXOs:

```bash
node . wallet sync
```

### Split UTXOs

If you are minting frequently, you can split your UTXOs into smaller outputs:

```bash
node . wallet split <count>
```

### Send funds

To send funds from your wallet to another address:

```bash
node . wallet send <address> <amount>
```

## Minting Pepinals

### Inscribe a file

To inscribe a file:

```bash
node . mint <address> <path>
```

To inscribe raw data:

```bash
node . mint <address> <content type> <hex data>
```

Examples:

```bash
node . mint PpB1ocks3ozcti7m5a3i2wViSuFAchLm3n pepe.jpeg
```

```bash
node . mint PqFpNRKEWeTusmJ5HCx3Hzc1YYKkKCc2ih "text/plain;charset=utf-8" 52696262697421
```

### Deploy PRC-20 tokens

To deploy a PRC-20 token:

```bash
node . prc-20 deploy <address> <ticker> <max token supply> <max allowed mint limit>
```

Example:

```bash
node . prc-20 deploy PqFpNRKEWeTusmJ5HCx3Hzc1YYKkKCc2ih frog 1000 100
```

### Mint PRC-20 tokens

To mint PRC-20 tokens:

```bash
node . prc-20 mint <address> <ticker> <amount>
```

Example:

```bash
node . prc-20 mint PqFpNRKEWeTusmJ5HCx3Hzc1YYKkKCc2ih frog 100
```

## Viewing Pepinals

### Start the server

To view inscriptions, start the server:

```bash
node . server
```

Access the server in your browser:

```bash
http://localhost:3000/tx/<transaction_id>
```

Replace `<transaction_id>` with the desired transaction ID.

## Troubleshooting

### ECONNREFUSED errors

Ensure your `.env` file is correctly configured with the Electrum server details. For example:

```env
ELECTRUMX_HOST=electrum.pepelum.site
ELECTRUMX_PORT=50002
ELECTRUMX_PROTOCOL=ssl
```

### Other issues

If you encounter problems, restart your Electrum connection or seek additional help online. Credits for Electrum servers: [Pepecoin Network](https://pepelum.site/?p=electrumX).
