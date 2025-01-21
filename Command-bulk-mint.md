# Bulk Minting Commands for Pepinals

This document explains the commands and usage for performing bulk minting of Pepinals using the provided automation script.

---

## Prerequisites

1. Ensure you have the following installed:
   - Node.js
   - The `pepinals.js` script in the same directory.
   - The bulk minting script `bulk-mint.sh`.
2. Configure your `.env` file with the necessary details:

```env
ELECTRUMX_HOST=electrum.pepelum.site
ELECTRUMX_PORT=50002
ELECTRUMX_PROTOCOL=ssl
TESTNET=false
FEE_PER_KB=25000000
WALLET=.wallet.json
```

---

## Commands Overview

### Bulk Minting Command

Use the bulk minting script to mint Pepinals in bulk.

### Script: `bulk-mint.sh`

#### Usage:

```bash
./bulk-mint.sh <target_address> <token_name> <mint_amount>
```

#### Parameters:

- `<target_address>`: Address to mint to.
- `<token_name>`: Name of the token being minted.
- `<mint_amount>`: Amount of tokens minted per iteration.

---

## Examples

### Example 1: Mint 1000 tokens of `pepe-token` to a specific address in 12 cycles

Command:

```bash
./bulk-mint.sh PqFpNRKEWeTusmJ5HCx3Hzc1YYKkKCc2ih pepi-token 10
```

- This command will:
  - Mint 1000 tokens of `pepe-token` per batch.
  - Perform 12 minting cycles (set directly in the script).
  - Tokens will be sent to the address `PXxqcV6yJnqd2x4xrZBF7XxJUxmxSxhMxn`.
  - A delay of 10 seconds is added between each cycle (set directly in the script).

---

## Notes

- Ensure your wallet has sufficient funds to cover the minting fees.
- Use reasonable delays to prevent overloading the network or hitting rate limits.
- Review transaction confirmations after execution to ensure all mints were successful.

---

## Troubleshooting

- **Permission Denied**:If you see `permission denied`, make sure the script is executable (`chmod +x bulk-mint.sh`).
- **Invalid Address**:Double-check that `<target_address>` is correct and valid.
- **Script Hangs or Appears Stuck**:

  - Network congestion or a slow node can cause delays in broadcasting transactions.
  - Check your internet connection and the node status.
- **Deprecation Warnings**:
  If you see `Buffer() is deprecated`, replace occurrences of `new Buffer(...)` with `Buffer.from(...)` in your Node.js scripts.

---

## Contact & Resources

- **Official Pepinals Documentation**: [https://github.com/YourPepinalsRepoHere](https://github.com/YourPepinalsRepoHere)
- **Support & Community**: For additional help, open an issue in the official Pepinals repository or contact your project administrators.
