# Pepinals Script Documentation

This documentation describes the usage of the Pepinals script, which integrates **bitcore-lib-pepe** and **electrum-client** to create transactions ("pepinals"), manage wallets, and interact with the PepeCoin network.

---

## **Main Commands**

### 1. `mint`

- **Description**: Inscribes data (hexadecimal or file content) into a series of transactions.
- **Usage**:

  ```bash
  node script.js mint <destination_address> <content_type> <hex_data>
  ```
- **Examples**:

  ```bash
  node script.js mint PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn "text/plain;charset=utf-8" 48656c6c6f
  ```

  ```bash
  node script.js mint PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn file.jpg
  ```

---

### 2. `wallet`

- **Description**: Manages the local wallet.
- **Subcommands**:
  - **`wallet new`**

    - **Description**: Creates a new wallet and saves it to `.wallet.json`.
    - **Usage**:
      ```bash
      node script.js wallet new
      ```
  - **`wallet sync`**

    - **Description**: Synchronizes the wallet with an Electrum server to update UTXOs.
    - **Usage**:
      ```bash
      node script.js wallet sync
      ```
  - **`wallet balance`**

    - **Description**: Displays the current wallet balance.
    - **Usage**:
      ```bash
      node script.js wallet balance
      ```
  - **`wallet send`**

    - **Description**: Sends funds to a specified address.
    - **Usage**:
      ```bash
      node script.js wallet send <destination_address> <amount_satoshis>
      ```
    - **Example**:
      ```bash
      node script.js wallet send PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn 50000
      ```
  - **`wallet split`**

    - **Description**: Splits the wallet balance into multiple UTXOs of equal value.
    - **Usage**:
      ```bash
      node script.js wallet split <number_of_splits>
      ```
    - **Example**:
      ```bash
      node script.js wallet split 5
      ```

---

### 3. `server`

- **Description**: Starts an HTTP server to extract data from transactions.
- **Usage**:

  ```bash
  node script.js server
  ```
- **Access**:
  Open your browser and navigate to:

  ```
  http://localhost:<port>/tx/<txid>
  ```

  Replace `<port>` with the port number (default: `3000`) and `<txid>` with the transaction ID.

---

### 4. `prc-20`

- **Description**: Manages PRC-20 tokens.
- **Subcommands**:
  - **`prc-20 deploy`**

    - **Description**: Deploys a new PRC-20 token with specified parameters.
    - **Usage**:
      ```bash
      node script.js prc-20 deploy <destination_address> <ticker> <max_supply> <limit_per_tx>
      ```
    - **Example**:
      ```bash
      node script.js prc-20 deploy PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn MYTOKEN 1000000 1000
      ```
  - **`prc-20 mint`**

    - **Description**: Mints new PRC-20 tokens.
    - **Usage**:
      ```bash
      node script.js prc-20 mint <destination_address> <ticker> <quantity>
      ```
  - **`prc-20 transfer`**

    - **Description**: Transfers PRC-20 tokens to another address.
    - **Usage**:
      ```bash
      node script.js prc-20 transfer <destination_address> <ticker> <quantity>
      ```

---

## **Special Commands**

### `mint` with File Input

- **Description**: Use this command to inscribe large files. The script automatically splits the file into multiple transactions.
- **Example**:
  ```bash
  node script.js mint PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn file.jpg
  ```

### `wallet split`

- **Description**: Splits the balance into multiple equal outputs (UTXOs).
- **Example**:

  ```bash
  node script.js wallet split 10
  ```

  **Result**: The balance is divided into 10 equal UTXOs.

### HTTP Server

- **Description**: Starts an HTTP server to extract and display transaction data.
- **Example**:

  ```bash
  node script.js server
  ```

  Open your browser and go to:

  ```
  http://localhost:3000/tx/<txid>
  ```

---

## **Electrum Integration**

- **Environment Variables**:
  - `ELECTRUMX_HOST`: Hostname of the Electrum server.
  - `ELECTRUMX_PORT`: Port of the Electrum server.
  - `ELECTRUMX_PROTOCOL`: Protocol (`ssl` or `tcp`).

---

For further assistance, contact support or refer to the official documentation of Pepinals.
