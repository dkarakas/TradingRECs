#! /bin/bash
echo "Creating network"
goal network create -r prv_network -n private -t genesis.json 
sleep 4
echo "Starting network"
goal network start -r prv_network
sleep 4
echo "Wallets in Primary node"
goal wallet list -d prv_network/Primary
sleep 4
echo "Wallets in Second node"
goal wallet list -d prv_network/Node
sleep 4
echo "Creating new wallet in Primary node called RECsWallet"
goal wallet new RECsWallet -d prv_network/Primary
sleep 4
echo "Wallets in Primary node"
goal wallet list -d prv_network/Primary
sleep 4
echo "Setting it as a default"
goal wallet -f RECsWallet -d prv_network/Primary
sleep 4
echo "Showing accs in both wallets"
goal account list -d prv_network/Primary -w unencrypted-default-wallet
goal account list -d prv_network/Primary
sleep 4
echo "Creating new account in RECsWallet"
goal account new -d prv_network/Primary
goal account new -d prv_network/Primary
goal account new -d prv_network/Primary
goal account rename $(goal account list -d prv_network/Primary | cut -f 2 | sed '1q;d') "Seller" -d prv_network/Primary
goal account rename $(goal account list -d prv_network/Primary | cut -f 2 | sed '2q;d') "Buyer" -d prv_network/Primary
goal account rename $(goal account list -d prv_network/Primary | cut -f 2 | sed '3q;d') "RECAggregator" -d prv_network/Primary
sleep 4
echo "Showing accs in RECsWallet"
goal account list -d prv_network/Primary
sleep 4
echo "Giving the accounts money"
addPrimary=$(goal account list -d prv_network/Primary -w unencrypted-default-wallet | cut -f 3 | sed '1q;d')
sellerAddr=$(goal account list -d prv_network/Primary | cut -f 3 | sed '1q;d')
buyerAddr=$(goal account list -d prv_network/Primary | cut -f 3 | sed '2q;d')
RECAggregatorAddr=$(goal account list -d prv_network/Primary | cut -f 3 | sed '3q;d')
goal clerk send -a 1000000000000000 -f "$addPrimary" -t  "$sellerAddr"  -d prv_network/Primary -w unencrypted-default-wallet
echo "Sleeping for 4 secs"
sleep 4
goal clerk send -a 1000000000000000 -f "$addPrimary" -t  "$buyerAddr"  -d prv_network/Primary -w unencrypted-default-wallet
echo "Sleeping for 4 secs"
sleep 4
goal clerk send -a 1000000000000000 -f "$addPrimary" -t  "$RECAggregatorAddr"  -d prv_network/Primary -w unencrypted-default-wallet
echo "Sleeping for 4 secs"
sleep 5
echo "Showing accs in RECsWallet"
goal account list -d prv_network/Primary
echo "Exporting Accounts"
echo "Type wallet password"
goal account export -a "$sellerAddr" -d prv_network/Primary/ | cut -f 2 -d "\"" > mnemonic_seller.txt
echo "Sleeping for 1 secs"
sleep 1
echo "Type wallet password"
goal account export -a "$buyerAddr" -d prv_network/Primary/ | cut -f 2 -d "\"" > mnemonic_buyer.txt
echo "Sleeping for 1 secs"
sleep 1
echo "Type wallet password"
goal account export -a "$RECAggregatorAddr" -d prv_network/Primary/ | cut -f 2 -d "\"" > mnemonic_RECAggregator.txt
echo "Sleeping for 1 secs"
sleep 1
cat mnemonic_seller.txt | cut -f 2 -d ":" | tr -d "\n" > mnemonicSeller.txt
cat mnemonic_buyer.txt | cut -f 2 -d ":" | tr -d "\n" > mnemonicBuyer.txt
cat mnemonic_RECAggregator.txt | cut -f 2 -d ":" | tr -d "\n" > mnemonicRECAggregator.txt
rm mnemonic_seller.txt
rm mnemonic_buyer.txt
rm mnemonic_RECAggregator.txt
cat prv_network/Primary/algod.net | cut -d ":" -f 2 > portToConnect.txt
cat prv_network/Primary/algod.token | cut -d ":" -f 2 > tokenToConnect.txt
echo $sellerAddr > ownerAddr.txt