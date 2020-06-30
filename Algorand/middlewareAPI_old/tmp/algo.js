
const algo = require('algosdk');
//
const token = "1cf3fbf6001281e44946b6c2230929183d5c81c49fa79f8d1cf783a7d65f5d61";
const server_ip = "127.0.0.1";
const port = 45797;

// //Recover the account
var mnemonic = "middle early theory claim offer symptom swift sponsor ten differ easy hip wish during industry limit video attract story april city siege whisper ability annual";
var recoveredAccount = algo.mnemonicToSecretKey(mnemonic);
console.log(recoveredAccount.addr);
//instantiate the algod wrapper
//
var text = Buffer.from('Dimcho');
var a = new Uint8Array(text.length);
for (var i = 0; i < text.length; i++) a[i] = text[i];
//
let algodclient = new algo.Algod(token, server_ip, port);
//
(async() => {
    //Get the relevant params from the algod
    let params = await algodclient.getTransactionParams();
    let endRound = params.lastRound + parseInt(1000);
    //create a transaction
    //note that the closeRemainderTo parameter is commented out
    //This parameter will clear the remaining funds in an account and
    //send to the specified account if main transaction commits
    let txn = {
        "from": recoveredAccount.addr,
        "to": "JESKMEXQVGQE4BMZQBBUY2UHJ5K77UOMGEFQUJ6AJWBXFRONYK36V3R2MQ",
        "fee": 10,
        "amount": 100000,
        "firstRound": params.lastRound,
        "lastRound": endRound,
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64,
        "note": a,
        //"closeRemainderTo": "IDUTJEUIEVSMXTU4LGTJWZ2UE2E6TIODUKU6UW3FU3UKIQQ77RLUBBBFLA"
    };
    //sign the transaction
    let signedTxn = algo.signTransaction(txn, recoveredAccount.sk);
    //submit the transaction
    let tx = (await algodclient.sendRawTransaction(signedTxn.blob));
    console.log("Transaction : " + tx.txId);

})().catch(e => {
    console.log(e);
});

// //
// (async () => {
//     let params = await algodclient.getTransactionParams();
//     console.log(params.lastRound);
//     mainloop:
//         for( let i=params.lastRound; i>(params.lastRound-100); i--){
//             let block = (await algodclient.block(i));
//
//             if(block.txns.transactions === undefined){
//                 continue;
//             }else {
//                 var length = block.txns.transactions.length;
//             }
//             // console.log(block);
//             console.log("Number of Transactions: " + length);
//             let txcn = length;
//             for( let j=0; j < txcn; j++){
//                 // console.log(block.txns.transactions[j]);
//                  if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
//                     let textedJson = JSON.stringify(block.txns.transactions[j], undefined, 4);
//                     console.log( "Transaction: " + textedJson );
//                     console.log(block.txns.transactions[j].note.toString());
//                     // break mainloop;
//                 }
//
//             }
//         }
//
// })().catch(e => {
//     console.log(e);
// });

