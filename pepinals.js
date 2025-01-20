#!/usr/bin/env node
/**
 * This script uses "bitcore-lib-pepe" to create transactions ("pepinals"),
 * and "electrum-client" to obtain UTXOs and broadcast transactions on the Pepe network
 * (instead of using a local RPC).
 */

const dogecore = require("bitcore-lib-pepe");
const fs = require("fs");
const dotenv = require("dotenv");
const mime = require("mime-types");
const express = require("express");
const ElectrumClient = require("electrum-client"); // npm install electrum-client

const { PrivateKey, Address, Transaction, Script, Opcode } = dogecore;
const { Hash, Signature } = dogecore.crypto;

dotenv.config();

// If TESTNET=true, set the default network to testnet
if (process.env.TESTNET === "true") {
  dogecore.Networks.defaultNetwork = dogecore.Networks.testnet;
}

// Set the fee per kB if available, otherwise use a large default value
if (process.env.FEE_PER_KB) {
  Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB);
} else {
  Transaction.FEE_PER_KB = 100000000;
}

// Path of the local wallet file
const WALLET_PATH = process.env.WALLET || ".wallet.json";

// Main function that manages command-line commands
async function main() {
  const cmd = process.argv[2];

  // If "pending-txs.json" exists, rebroadcast pending transactions
  if (fs.existsSync("pending-txs.json")) {
    console.log("found pending-txs.json. rebroadcasting...");
    const txs = JSON.parse(fs.readFileSync("pending-txs.json"));
    await broadcastAll(
      txs.map((txHex) => new Transaction(txHex)),
      false
    );
    return;
  }

  // Dispatch the main commands
  if (cmd === "mint") {
    await mint();
  } else if (cmd === "wallet") {
    await wallet();
  } else if (cmd === "server") {
    await server();
  } else if (cmd === "prc-20") {
    await doge20();
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

/* --------------------------------------------------------------------------
 *                         ELECTRUM CLIENT
 * -------------------------------------------------------------------------- */

/**
 * Create an Electrum client using the ENV:
 *   ELECTRUMX_HOST, ELECTRUMX_PORT, ELECTRUMX_PROTOCOL
 * and connect to the server.
 */
async function connectElectrum() {
  const host = process.env.ELECTRUMX_HOST;
  const port = parseInt(process.env.ELECTRUMX_PORT, 10);
  const protocol = process.env.ELECTRUMX_PROTOCOL || "ssl";

  const client = new ElectrumClient(port, host, protocol);
  // Connect to the server (name and version are arbitrary)
  await client.connect("pepinals-client", "1.4");
  return client;
}

/**
 * Converts an address into a scripthash for use with Electrum.
 * (Electrum uses `sha256(scriptPubKey)`, reversed as hex.)
 */
function addressToScriptHash(addrStr) {
  const address = Address.fromString(addrStr);
  const script = Script.buildPublicKeyHashOut(address);
  const hash = Hash.sha256(script.toBuffer()).reverse().toString("hex");
  return hash;
}

/* --------------------------------------------------------------------------
 *                     SUBCOMMANDS "prc-20" (deploy, mint, transfer)
 * -------------------------------------------------------------------------- */
async function doge20() {
  const subcmd = process.argv[3];

  if (subcmd === "mint") {
    await doge20Transfer("mint");
  } else if (subcmd === "transfer") {
    await doge20Transfer("transfer");
  } else if (subcmd === "deploy") {
    await doge20Deploy();
  } else {
    throw new Error(`unknown subcommand: ${subcmd}`);
  }
}

// Example of a prc-20 token "deploy"
async function doge20Deploy() {
  const argAddress = process.argv[4];
  const argTicker = process.argv[5];
  const argMax = process.argv[6];
  const argLimit = process.argv[7];

  const doge20Tx = {
    p: "prc-20",
    op: "deploy",
    tick: argTicker.toLowerCase(),
    max: `${argMax}`,
    lim: `${argLimit}`,
  };

  const parsedDoge20Tx = JSON.stringify(doge20Tx);
  const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString("hex");

  console.log("Deploying prc-20 token...");
  await mint(argAddress, "text/plain;charset=utf-8", encodedDoge20Tx);
}

// Example of a "mint" or "transfer" operation for a prc-20 token
async function doge20Transfer(operation = "transfer") {
  const argAddress = process.argv[4];
  const argTicker = process.argv[5];
  const argAmount = process.argv[6];
  const argRepeat = Number(process.argv[7]) || 1;

  const doge20Tx = {
    p: "prc-20",
    op: operation,
    tick: argTicker.toLowerCase(),
    amt: `${argAmount}`,
  };

  const parsedDoge20Tx = JSON.stringify(doge20Tx);
  const encodedDoge20Tx = Buffer.from(parsedDoge20Tx).toString("hex");

  for (let i = 0; i < argRepeat; i++) {
    console.log(`Minting prc-20 token... ${i + 1} of ${argRepeat} times`);
    await mint(argAddress, "text/plain;charset=utf-8", encodedDoge20Tx);
  }
}

/* --------------------------------------------------------------------------
 *                 WALLET COMMANDS (wallet new, sync, send, etc.)
 * -------------------------------------------------------------------------- */
async function wallet() {
  const subcmd = process.argv[3];

  if (subcmd === "new") {
    walletNew();
  } else if (subcmd === "sync") {
    await walletSync();
  } else if (subcmd === "balance") {
    walletBalance();
  } else if (subcmd === "send") {
    await walletSend();
  } else if (subcmd === "split") {
    await walletSplit();
  } else {
    throw new Error(`unknown subcommand: ${subcmd}`);
  }
}

// Creates a new wallet (privkey + address) and saves it in WALLET_PATH
function walletNew() {
  if (!fs.existsSync(WALLET_PATH)) {
    const privateKey = new PrivateKey();
    const privkey = privateKey.toWIF();
    const address = privateKey.toAddress().toString();
    const json = { privkey, address, utxos: [] };
    fs.writeFileSync(WALLET_PATH, JSON.stringify(json, null, 2));
    console.log("address", address);
  } else {
    throw new Error("wallet already exists");
  }
}

/**
 * Synchronize the wallet's UTXO data with an Electrum server
 * and update WALLET_PATH.
 */
async function walletSync() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));

  console.log(`syncing utxos with Electrum server for address: ${wallet.address}`);

  // Connect to Electrum
  const client = await connectElectrum();
  try {
    // Calculate the corresponding scripthash
    const scripthash = addressToScriptHash(wallet.address);
    // Get the list of UTXOs
    const listUnspent = await client.blockchainScripthash_listunspent(scripthash);
    // Example array: [ { tx_hash, tx_pos, value, height }, ... ]

    // Map Electrum fields -> internal fields
    wallet.utxos = listUnspent.map((u) => ({
      txid: u.tx_hash,
      vout: u.tx_pos,
      script: Script.buildPublicKeyHashOut(Address.fromString(wallet.address)).toHex(),
      satoshis: u.value,
    }));

    fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));

    let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);
    console.log("balance", balance);
  } finally {
    // Close the connection
    await client.close();
  }
}

// Prints the balance
function walletBalance() {
  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);
  console.log(wallet.address, balance);
}

/**
 * Send <argAmount> satoshis to <argAddress> using the wallet's UTXOs
 */
async function walletSend() {
  const argAddress = process.argv[4];
  const argAmount = parseInt(process.argv[5], 10);

  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);

  if (balance === 0) {
    throw new Error("no funds to send");
  }

  const receiver = new Address(argAddress);

  let tx = new Transaction();
  if (argAmount) {
    tx.to(receiver, argAmount);
    fund(wallet, tx);
  } else {
    // If the amount is not specified, send everything
    tx.from(wallet.utxos);
    tx.change(receiver);
    tx.sign(wallet.privkey);
  }

  await broadcast(tx, true);
  console.log(tx.hash);
}

/**
 * Split the wallet funds into "splits" outputs
 */
async function walletSplit() {
  const splits = parseInt(process.argv[4], 10);

  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  let balance = wallet.utxos.reduce((acc, curr) => acc + curr.satoshis, 0);
  if (balance === 0) throw new Error("no funds to split");

  let tx = new Transaction();
  tx.from(wallet.utxos);

  for (let i = 0; i < splits - 1; i++) {
    tx.to(wallet.address, Math.floor(balance / splits));
  }
  tx.change(wallet.address);
  tx.sign(wallet.privkey);

  await broadcast(tx, true);
  console.log(tx.hash);
}

/* --------------------------------------------------------------------------
 *                         MINT FUNCTION (inscribe)
 * -------------------------------------------------------------------------- */

const MAX_SCRIPT_ELEMENT_SIZE = 520;

/**
 * Perform inscription of "data" in a series of transactions.
 * If paramContentTypeOrFilename is an existing file, read it from disk.
 * Otherwise, interpret it as a literal content type and use paramHexData as a hex buffer.
 */
async function mint(paramAddress, paramContentTypeOrFilename, paramHexData) {
  const argAddress = paramAddress || process.argv[3];
  const argContentTypeOrFilename = paramContentTypeOrFilename || process.argv[4];
  const argHexData = paramHexData || process.argv[5];

  const address = new Address(argAddress);
  let contentType;
  let data;

  if (fs.existsSync(argContentTypeOrFilename)) {
    contentType = mime.contentType(mime.lookup(argContentTypeOrFilename));
    data = fs.readFileSync(argContentTypeOrFilename);
  } else {
    contentType = argContentTypeOrFilename;
    if (!/^[a-fA-F0-9]*$/.test(argHexData)) {
      throw new Error("data must be hex");
    }
    data = Buffer.from(argHexData, "hex");
  }

  if (data.length === 0) {
    throw new Error("no data to mint");
  }

  if (contentType.length > MAX_SCRIPT_ELEMENT_SIZE) {
    throw new Error("content type too long");
  }

  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
  const txs = inscribe(wallet, address, contentType, data);

  // Broadcast all created transactions
  await broadcastAll(txs, false);
}

/**
 * Broadcast multiple transactions in order, saving to pending-txs.json if there is an error.
 */
async function broadcastAll(txs, retry) {
  for (let i = 0; i < txs.length; i++) {
    console.log(`broadcasting tx ${i + 1} of ${txs.length}`);
    try {
      await broadcast(txs[i], retry);
    } catch (e) {
      console.log("broadcast failed", e?.message || e);
      console.log("saving pending txs to pending-txs.json");
      fs.writeFileSync(
        "pending-txs.json",
        JSON.stringify(txs.slice(i).map((tx) => tx.toString()))
      );
      process.exit(1);
    }
  }

  try {
    fs.unlinkSync("pending-txs.json");
  } catch (_) {
    // ignore
  }

  if (txs.length > 1) {
    console.log("inscription txid:", txs[1].hash);
  }
}

// Helpers for handling script chunks
function bufferToChunk(b, type) {
  b = Buffer.from(b, type);
  return {
    buf: b.length ? b : undefined,
    len: b.length,
    opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77,
  };
}

function numberToChunk(n) {
  return {
    buf:
      n <= 16
        ? undefined
        : n < 128
        ? Buffer.from([n])
        : Buffer.from([n % 256, n / 256]),
    len: n <= 16 ? 0 : n < 128 ? 1 : 2,
    opcodenum: n === 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2,
  };
}

function opcodeToChunk(op) {
  return { opcodenum: op };
}

const MAX_CHUNK_LEN = 240;
const MAX_PAYLOAD_LEN = 1500;

/**
 * Builds the "inscribe" transactions from a wallet, content, and contentType.
 */
function inscribe(wallet, address, contentType, data) {
  const txs = [];

  const privateKey = new PrivateKey(wallet.privkey);
  const publicKey = privateKey.toPublicKey();

  // Segment data into smaller parts
  let parts = [];
  while (data.length) {
    const part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length));
    data = data.slice(part.length);
    parts.push(part);
  }

  // Build a custom script with prefix "ord" (or "pep" if you prefer)
  const inscription = new Script();
  inscription.chunks.push(bufferToChunk("ord"));
  inscription.chunks.push(numberToChunk(parts.length));
  inscription.chunks.push(bufferToChunk(contentType));
  parts.forEach((part, n) => {
    inscription.chunks.push(numberToChunk(parts.length - n - 1));
    inscription.chunks.push(bufferToChunk(part));
  });

  let p2shInput;
  let lastLock;
  let lastPartial;

  // Create partial transactions
  while (inscription.chunks.length) {
    const partial = new Script();

    // If it's the very first transaction, shift the first chunk
    if (txs.length === 0) {
      partial.chunks.push(inscription.chunks.shift());
    }

    // Add chunks in pairs until exceeding MAX_PAYLOAD_LEN
    while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
      partial.chunks.push(inscription.chunks.shift());
      partial.chunks.push(inscription.chunks.shift());
    }

    // If overshoot, put back the last chunk
    if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
      inscription.chunks.unshift(partial.chunks.pop());
      inscription.chunks.unshift(partial.chunks.pop());
    }

    // Create the lock script to be hashed (P2SH)
    const lock = new Script();
    lock.chunks.push(bufferToChunk(publicKey.toBuffer()));
    lock.chunks.push(opcodeToChunk(Opcode.OP_CHECKSIGVERIFY));
    partial.chunks.forEach(() => {
      lock.chunks.push(opcodeToChunk(Opcode.OP_DROP));
    });
    lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE));

    const lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()));
    const p2sh = new Script();
    p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160));
    p2sh.chunks.push(bufferToChunk(lockhash));
    p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL));

    // Output with a fixed amount (100000 sat)
    const p2shOutput = new Transaction.Output({
      script: p2sh,
      satoshis: 100000,
    });

    // Build the tx
    const tx = new Transaction();
    if (p2shInput) {
      tx.addInput(p2shInput);
    }
    tx.addOutput(p2shOutput);
    fund(wallet, tx);

    // Sign the previous input if it exists
    if (p2shInput) {
      const signature = Transaction.sighash.sign(
        tx,
        privateKey,
        Signature.SIGHASH_ALL,
        0,
        lastLock
      );
      const txsignature = Buffer.concat([
        signature.toBuffer(),
        Buffer.from([Signature.SIGHASH_ALL]),
      ]);

      const unlock = new Script();
      unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
      unlock.chunks.push(bufferToChunk(txsignature));
      unlock.chunks.push(bufferToChunk(lastLock.toBuffer()));
      tx.inputs[0].setScript(unlock);
    }

    updateWallet(wallet, tx);
    txs.push(tx);

    p2shInput = new Transaction.Input({
      prevTxId: tx.hash,
      outputIndex: 0,
      output: tx.outputs[0],
      script: "",
    });

    p2shInput.clearSignatures = () => {};
    p2shInput.getSignatures = () => {};

    lastLock = lock;
    lastPartial = partial;
  }

  // Create the final TX that redeems the script and sends the inscription to the address
  const finalTx = new Transaction();
  finalTx.addInput(p2shInput);
  finalTx.to(address, 100000);
  fund(wallet, finalTx);

  const signature = Transaction.sighash.sign(
    finalTx,
    privateKey,
    Signature.SIGHASH_ALL,
    0,
    lastLock
  );
  const txsignature = Buffer.concat([
    signature.toBuffer(),
    Buffer.from([Signature.SIGHASH_ALL]),
  ]);

  const unlock = new Script();
  unlock.chunks = unlock.chunks.concat(lastPartial.chunks);
  unlock.chunks.push(bufferToChunk(txsignature));
  unlock.chunks.push(bufferToChunk(lastLock.toBuffer()));
  finalTx.inputs[0].setScript(unlock);

  updateWallet(wallet, finalTx);
  txs.push(finalTx);

  return txs;
}

/**
 * Adds UTXOs until covering outputs+fee, signing gradually with the wallet's privkey.
 */
function fund(wallet, tx) {
  tx.change(wallet.address);
  delete tx._fee;

  for (const utxo of wallet.utxos) {
    if (tx.inputs.length && tx.outputs.length && tx.inputAmount >= tx.outputAmount + tx.getFee()) {
      break;
    }
    delete tx._fee;
    tx.from(utxo);
    tx.change(wallet.address);
    tx.sign(wallet.privkey);
  }

  if (tx.inputAmount < tx.outputAmount + tx.getFee()) {
    throw new Error("not enough funds");
  }
}

/**
 * Updates the wallet UTXOs: removes the spent ones and adds new outputs that return to the address
 */
function updateWallet(wallet, tx) {
  // Remove spent UTXOs
  wallet.utxos = wallet.utxos.filter((utxo) => {
    for (const input of tx.inputs) {
      if (
        input.prevTxId.toString("hex") === utxo.txid &&
        input.outputIndex === utxo.vout
      ) {
        return false;
      }
    }
    return true;
  });

  // Add outputs that return to our address
  tx.outputs.forEach((output, vout) => {
    const outAddr = output.script.toAddress();
    if (outAddr && outAddr.toString() === wallet.address) {
      wallet.utxos.push({
        txid: tx.hash,
        vout,
        script: output.script.toHex(),
        satoshis: output.satoshis,
      });
    }
  });
}

/* --------------------------------------------------------------------------
 *                         BROADCAST / EXTRACT
 * -------------------------------------------------------------------------- */

/**
 * Broadcasts a single transaction via Electrum:
 * uses blockchainTransaction_broadcast(rawTxHex)
 */
async function broadcast(tx, retry) {
  const client = await connectElectrum();
  try {
    const rawTxHex = tx.toString();
    const txid = await client.blockchainTransaction_broadcast(rawTxHex);
    // If transmission succeeds, update the wallet and close
    const wallet = JSON.parse(fs.readFileSync(WALLET_PATH));
    updateWallet(wallet, tx);
    fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
    return txid;
  } catch (err) {
    if (!retry) throw err;
    // If "retry" is true, you could implement a retry logic
    throw err;
  } finally {
    await client.close();
  }
}

/**
 * Example of extracting a "pepinal" / "doginal" from a transaction via Electrum
 */
async function extract(txid) {
  const client = await connectElectrum();
  try {
    const txHex = await client.blockchainTransaction_get(txid, false);
    if (!txHex) {
      throw new Error(`Transaction not found: ${txid}`);
    }

    const transaction = Transaction.fromString(txHex);
    const scriptHex = transaction.inputs[0].script.toHex();
    const script = Script.fromHex(scriptHex);
    const chunks = script.chunks;

    const prefix = chunks.shift().buf.toString("utf-8");
    if (prefix !== "ord") {
      throw new Error("not a pepinal");
    }

    const pieces = chunkToNumber(chunks.shift());
    const contentType = chunks.shift().buf.toString("utf-8");

    let data = Buffer.alloc(0);
    let remaining = pieces;

    while (remaining && chunks.length) {
      const n = chunkToNumber(chunks.shift());
      if (n !== remaining - 1) {
        throw new Error("Multi-part pepinal parsing not fully implemented here");
      }
      data = Buffer.concat([data, chunks.shift().buf]);
      remaining -= 1;
    }

    return {
      contentType,
      data,
    };
  } finally {
    await client.close();
  }
}

/**
 * Convert chunk to number (inverse of numberToChunk)
 */
function chunkToNumber(chunk) {
  if (chunk.opcodenum === 0) return 0;
  if (chunk.opcodenum === 1 && chunk.buf) return chunk.buf[0];
  if (chunk.opcodenum === 2 && chunk.buf) {
    return chunk.buf[1] * 255 + chunk.buf[0];
  }
  if (chunk.opcodenum > 80 && chunk.opcodenum <= 96) {
    return chunk.opcodenum - 80;
  }
  return undefined;
}

/* --------------------------------------------------------------------------
 *                    HTTP SERVER (optional)
 * -------------------------------------------------------------------------- */
function server() {
  const app = express();
  const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000;

  app.get("/tx/:txid", (req, res) => {
    extract(req.params.txid)
      .then((result) => {
        res.setHeader("content-type", result.contentType);
        res.send(result.data);
      })
      .catch((e) => res.send(e.message));
  });

  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
    console.log(`Example: http://localhost:${port}/tx/<your_txid_here>`);
  });
}

/* --------------------------------------------------------------------------
 *                    SCRIPT START
 * -------------------------------------------------------------------------- */
main().catch((e) => {
  console.error(e && e.message ? e.message : e);
});