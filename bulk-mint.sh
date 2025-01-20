#!/bin/bash

# Check if 3 arguments are passed, otherwise exit
if [ "$#" -ne 3 ]; then
    echo "Illegal number of parameters"
    echo "Usage: bulk-mint-pepinals.sh <max_count> <target_address> <token_name>"
    exit 1
fi

# Assign arguments to variables
count=0
max_count=$1
target_address=$2
token_name=$3

# Loop for minting tokens
while [ $count -lt $max_count ]; do
    echo "Current count: $count"
    
    # Replace the command with your specific 'pepinals' mint command
    node . prc-20 mint "$target_address" "$token_name" 1000 12
    
    remaining=$((max_count - count - 1))
    echo "Remaining mints: $remaining"
    
    # Pause to avoid overloading the server (adjust as needed)
    sleep 200  # Sleep for 3.5 minutes
    
    ((count++))
done

echo "Bulk minting completed. Total mints: $max_count"