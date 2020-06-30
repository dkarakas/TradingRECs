#!/bin/bash
ownerAddr="ISY6UVGVBFQZB3JJCIHDOMT47IAOK772KG76DHPUQYYBACPTYHINOVGVOY"
buyerAddr="LPCO5B3PSL6JID75HHKZDKJKFER2C2CREAUTK4K3HXMCUMFCWHWA6FJMS4"
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":1000,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$ownerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":2001,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$ownerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":1231,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$buyerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":5420,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$ownerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":1300,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$buyerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
curl -k --request POST --data '{"cert":{"type":"Cert","powerProdWh":1530,"hashX509":"Will be a sha256","prevTx":"t","owner":"'"$ownerAddr"'"}}' https://localhost/newCert
echo ""
sleep 3
