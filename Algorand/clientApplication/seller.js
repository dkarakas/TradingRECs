const fs = require('fs');
const algo = require('algosdk');
const request = require('request');
const config = require('./config');
const chalk = require('chalk');
const figlet = require('figlet');
const prompts = require('./app_files/prompts');
const util = require('./app_files/utils');

let mnemonicSeller = "";
let recovered_account;
let params;

function prepSeller() {
    try {
        mnemonicSeller = fs.readFileSync(config.seller.mnemonicLocation, 'utf8').trim();
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

    //Recover the account
    recovered_account = algo.mnemonicToSecretKey(mnemonicSeller);
    console.log(recovered_account.addr);
    //check to see if account is valid
    var isValid = algo.isValidAddress(recovered_account.addr);
    console.log("Is this a valid address: " + isValid);
};

function showAvailableRECs(){
    return new Promise((resolve, rejecet) => {
        request({
            url: 'https://localhost/showAvailableRECs',
            qs: {owner: recovered_account.addr},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(JSON.parse(body));
            }
            if (error) {
                reject(error);
            }
        });
    });
}


function getParams() {
    request({
        url: 'https://localhost/getParams',
        strictSSL: false
        }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            params = JSON.parse(body);
            // console.log(params);
        }
        if(error){
            console.log(error);
        }
    });
}

function getAccount(accountAddress) {
    return new Promise ((resolve, reject) => {request({
            url: 'https://localhost/getAccount',
            qs : {accountAddress : accountAddress},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resolve(JSON.parse(body));
            }else{
                console.log("Error getting account!");
            }
            if (error) {
                console.log(error);
                reject(error);
            }
        });}
    );
}


function proposeSettle(minPrice, length, finalPrice, bidId) {
    let txn = {
        "from": recovered_account.addr,
        "to": recovered_account.addr,
        "fee": params.fee,
        "amount": 1,
        "firstRound": params.lastRound,
        "lastRound": params.lastRound + length,
        "note": util.convertToUint8Array(JSON.stringify({
            "type": "proposeSettle",
            "minPrice" : minPrice,
            "finalPrice" : finalPrice,
            "prevTx" : bidId
        })),
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64
    };

    //sign the transaction
    var signedTxn = algo.signTransaction(txn, recovered_account.sk);
    return new Promise((resolve, reject) => {
        request({
            url: 'https://localhost/proposeSettle',
            body: JSON.stringify({algoTx: Buffer.from(signedTxn.blob)}),
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            }
            if (error) {
                reject(error);
            }
        });
    });
}

function getBids(listingId, RECId) {
    return new Promise((resolve, reject) => {
        request({
            url: 'https://localhost/getBids',
            qs : {listing : listingId, RECId: RECId},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            }else {
                reject(body);
            }
    })});
}


function listREC(validityLength, minPrice, recId) {
    return new Promise((resolve,reject) => {

        let txn = {
            "from": recovered_account.addr,
            "to": recovered_account.addr,
            "fee": params.fee,
            "amount": 1,
            "firstRound": params.lastRound,
            "lastRound": params.lastRound + validityLength,
            "note": util.convertToUint8Array(JSON.stringify({
                "type": "Listing",
                "minPrice": minPrice,
                "prevTx": recId
            })),
            "genesisID": params.genesisID,
            "genesisHash": params.genesishashb64
        };

        //sign the transaction
        let signedTxn = algo.signTransaction(txn, recovered_account.sk);
        request({
            url: 'https://localhost/listREC',
            body: JSON.stringify({algoTx: Buffer.from(signedTxn.blob)}),
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            }
            if (error) {
                reject(error);
            }
        });
    });
}

function retireREC(RECid){
    let txn = {
        "from": recovered_account.addr,
        "to": recovered_account.addr,
        "fee": params.fee,
        "amount": 1,
        "firstRound": params.lastRound,
        "lastRound": params.lastRound + 100,
        "note": util.convertToUint8Array(JSON.stringify({
            "type": "Retire",
            "prevTx" : RECid
        })),
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64
    };

    //sign the transaction
    var signedTxn = algo.signTransaction(txn, recovered_account.sk);
    return new Promise( (resolve, reject) => {
        request({
            url: 'https://localhost/retireREC',
            body: JSON.stringify({algoTx: Buffer.from(signedTxn.blob), fromAddr: recovered_account.addr}),
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(body);
            } else {
                reject("There was an issue retiring the REC!");
            }
        });
    });
}

console.log(
    chalk.green(
        figlet.textSync('REC Seller App', { horizontalLayout: 'full' })
    )
);

prepSeller();

(async () => {
    try{
        params = getParams();
        let RECs = await showAvailableRECs();
        let options = await prompts.listingOptions();
        if(options.listingOptions === 'List REC'){
            let chosenREC = await prompts.listREC(RECs.map( REC => JSON.stringify({id: REC.tx.tx,
                REC: JSON.parse(Buffer.from(REC.tx.note).toString())})));
            let listingREC = await listREC(parseInt(chosenREC.length), parseInt(chosenREC.price),
                JSON.parse(chosenREC.listingChoice).id);
            console.log("Successfully listed a REC! Transaction id: " + JSON.parse(listingREC).txId);
            fs.appendFileSync("saveListings.txt", "\n" + JSON.stringify({id: JSON.parse(listingREC).txId,
                RECid: JSON.parse(chosenREC.listingChoice).id, REC: JSON.parse(chosenREC.listingChoice).REC}));
        }else if(options.listingOptions === 'Check bids for listing'){
            let listOptions = [];
            if(fs.existsSync("saveListings.txt")){
                listOptions = fs.readFileSync("saveListings.txt");
                listOptions = listOptions.toString().split("\n");
                listOptions = listOptions.slice(1)
            }
            let chosenList = await prompts.chooseListing(listOptions);
            let bids = await getBids(JSON.parse(chosenList.listingChoice).id, JSON.parse(chosenList.listingChoice).RECid);
            let chosenBid = await prompts.chooseBidSeller(JSON.parse(bids).map( bid =>
                JSON.stringify({id: bid.tx.tx, sender: bid.tx.from,
                    bid: JSON.parse(Buffer.from(bid.tx.note).toString())})));
            let accountInfo = await getAccount(JSON.parse(chosenBid.bidChoice).sender);
            if(JSON.parse(accountInfo).amount < parseInt(chosenBid.finalPrice)){
                console.log("Account does not have sufficient funds!")
            }else {
                console.log(await proposeSettle(0, parseInt(chosenBid.length),
                    parseInt(chosenBid.finalPrice), JSON.parse(chosenBid.bidChoice).id));
            }
        }else{
            let chosenREC = await prompts.retireREC(RECs.map( REC => JSON.stringify({id: REC.tx.tx,
                REC: JSON.parse(Buffer.from(REC.tx.note).toString())})));
            let retiringREC = await retireREC(JSON.parse(chosenREC.retireREC).id);
            console.log("Successfully retired a REC! Transaction id: " + JSON.parse(retiringREC).txId);
            fs.appendFileSync("retiredRECs.txt", "\n" + JSON.parse(retiringREC).txId);
        }
    }catch (e) {
        console.log(e);
    }
})();





