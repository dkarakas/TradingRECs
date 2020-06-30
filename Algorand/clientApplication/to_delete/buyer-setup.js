//node example
const algosdk = require('algosdk');
const fs = require('fs');
//create an account
var account = algosdk.generateAccount();
console.log( account.addr );
//get backup phrase for account
var mnemonic = algosdk.secretKeyToMnemonic(account.sk);
console.log( mnemonic );

fs.writeFile('seller_mnemonic.txt', mnemonic, function (err) {
    if(err)
        console.log(err);
    console.log("Mnemonic for seller generated!\n");
});