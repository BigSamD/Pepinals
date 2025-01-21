#!/bin/bash

# This script performs a fixed number of minting cycles (max_count),
# each calling "node . prc-20 mint" with a given target address, token name,
# and mint amount. The final "12" in the mint command indicates the number of
# times minted in a single batch. The script sleeps 10 seconds between cycles.

# Check if exactly 3 arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <target_address> <token_name> <mint_amount>"
    exit 1
fi

# Assign command-line arguments to variables
target_address=$1
token_name=$2
mint_amount=$3

# Set the total number of cycles here
max_count=12

# Initialize a counter
count=0

# Start the loop
while [ $count -lt $max_count ]; do
    echo "------------------------------------------"
    echo "Cycle: $((count+1)) of $max_count"
    echo "Minting $mint_amount tokens of '$token_name' to '$target_address' (12 times in one command)..."

    # Call the mint command
    node . prc-20 mint "$target_address" "$token_name" "$mint_amount" 12
    # English comment:
    # - "$target_address": Where tokens will be minted
    # - "$token_name": Token ticker/name
    # - "$mint_amount": How many tokens to mint
    # - "12": Number of times minted in a single batch

    # If the node command fails for any reason, exit
    if [ $? -ne 0 ]; then
        echo "Error: Mint command failed."
        exit 1
    fi

    remaining=$((max_count - count - 1))
    echo "Remaining cycles: $remaining"

    # Sleep for 10 seconds before starting the next cycle
    sleep 10
    # English comment:
    # Adjust this pause if you need a different waiting period

    ((count++))
done

echo "------------------------------------------"
echo "Bulk minting completed after $max_count cycles."
