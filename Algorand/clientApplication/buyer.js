const crypto = require('crypto');
const ecdh = crypto.createECDH('secp256k1');
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
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
let listings = {};


//Trusted Root CAs in PEM Format
let caCertPromise = util.readFile(config.certificates.AzureSphereRoot);
let caCert2Promise = util.readFile(config.certificates.LocalCA);
let listRootCAs = [];
Promise.all([caCertPromise, caCert2Promise])
    .then(result => {result.forEach(
        function(item, index){
            listRootCAs.push(item.toString());});})
    .catch(err => {
        console.log("Cannot get CA certificates!");
        console.log(err);
        process.exit(1)});


/**
 * Gets the public key of the REC aggregator, to ensure that the REC are created by smart meter that is approved by the
 * REC aggregator
 */

fs.readFile('../middlewareAPI/keys/pubKey', function (err, data) {
    if(err){
        console.log(err);
        process.exit(1);
    }else {
        ecdh.setPublicKey(data.toString(),'base64');
    }
});

/**
 * Gets the blockchain address of the buyer
 */
function getBuyerAddr() {
    try {
        // mnemonicSeller = fs.readFileSync('seller_mnemonic.txt', 'utf8');
        mnemonicSeller = fs.readFileSync(config.buyer.mnemonicLocation, 'utf8').trim();
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

    //Recover the account
    recovered_account = algo.mnemonicToSecretKey(mnemonicSeller);
    console.log("Your Algorand blockchain address is: " + recovered_account.addr);
    //check to see if account is valid
    var isValid = algo.isValidAddress(recovered_account.addr);
    if(!isValid){
        console.log("The mnemonic is not valid! Check the configurations!");
        process.exit(1);
    }
};

function showListings(){
    return new Promise((resolve, reject) =>{request({
        url: 'https://localhost/showListings',
        qs : {owner : recovered_account.addr},
        strictSSL: false
    }, function (error, response, body) {
        if (error) {
            console.log(error);
            reject(error);
        }
        if (!error && response.statusCode == 200) {
            console.log("\nAvailable listings for you:");
            let arrListings = JSON.parse(body);
            let optionsForRes = [];
            arrListings.forEach(listing => {
                //show only if the listing is not expired
                if(params.lastRound <= listing.listing.tx['last-round']) {
                    listings[listing.listing.tx.tx] = listing.listing;
                    optionsForRes.push(JSON.stringify({
                        id: listing.listing.tx.tx,
                        sellerAddr: listing.listing.tx.from,
                        minPrice: JSON.parse(Buffer.from(listing.listing.tx.note).toString()).minPrice,
                        REC: JSON.parse(Buffer.from(listing.REC.note).toString())
                    }));
                }
            });
            resolve(optionsForRes);
        }
    })
    });
}

function getParams() {
    request({
        url: 'https://localhost/getParams',
        strictSSL: false
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            params = JSON.parse(body);
        }
        if(error){
            console.log(error);
        }
    });
}

function getListingInfo(listingId, listingSender) {
    return new Promise ((resolve, reject) => {
        request({
            url: 'https://localhost/getListingInfo',
            qs: {listingTx: listingId, sender: listingSender},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                resolve(response.body)
            }
            if (error) {
                console.log(error);
                reject(resolve);
            }
        })
    });
}

//
/**
 * Determines if listing is valid.
 * @param {Object} listingInfo - holds the listing, REC, and metadata
 * @return {bool}
 */
async function validateListing(listingInfo) {
    if(listingInfo.listing.from !== listingInfo.REC.owner){
        console.log("Error!");
        console.log('The listing is not from the owner of the REC!');
        return false;
    }
    let copyREC = JSON.parse(JSON.stringify(listingInfo.REC));
    delete copyREC.sigDevice;
    let msgToCheck = JSON.stringify(copyREC).replace("{","").replace("}","");

    //check if the REC was signed by the device
    let signatureDevice = Buffer.from(listingInfo.REC.sigDevice, "base64").toString("hex");

    let pubKeyDevice = ec.keyFromPublic(Buffer.from(listingInfo.device.PK_Master, 'base64').toString('hex'),'hex');
    if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
        console.log("Error!");
        console.log('The REC was not signed by the approved device!');
        return false;
    }

    let dataCopy = JSON.parse(JSON.stringify(listingInfo.device));
    delete dataCopy.signRECaggregator;

    if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(),
        listingInfo.device.signRECaggregator, ecdh.getPublicKey())){
        console.log("Error!");
        console.log('The device referenced was not signed by approved REC aggregator!');
        return false;
    }
    if(listingInfo.x509Cert === undefined){
        console.log('Not X509 REC! Cannot trust!');
        return false;
    }
    let clientCert = util.rawToPem(Buffer.from(listingInfo.x509Cert));
    try {
        await util.verifySigningChain(clientCert, listRootCAs);
    }catch (e){
        console.log(e);
        console.log('Cannot verify the X509 certificate!');
        return false;
    }
    return true;
}

function bid(amount, listing) {
    let txn = {
        "from": recovered_account.addr,
        "to": recovered_account.addr,
        "fee": params.fee,
        "amount": 0,
        "firstRound": params.lastRound,
        "lastRound": listing.tx['last-round'],
        "note": util.convertToUint8Array(JSON.stringify({
            "type": "Bid",
            "bid": amount,
            "prevTx": listing.tx.tx
        })),
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64
    };

    //sign the transaction
    var signedTxn = algo.signTransaction(txn, recovered_account.sk);
    return new Promise((resolve,reject) => {request({
            url: 'https://localhost/bidListing',
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

function checkListing(proposalId, proposalSenderAddress) {
    return new Promise((resolve, reject) => {
        request({
            url: 'https://localhost/getSettleInfo',
            qs : {proposeSettleTx: proposalId, seller: proposalSenderAddress, buyer: recovered_account.addr},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let response = JSON.parse(body);
                if(response.listing.from !== response.proposeSettle.from){
                    reject('Propose Settle is not sent from the same address as listing!');
                }
                if(response.bid.from !== recovered_account.addr){
                    reject('You did not submit the bit referenced by propose settle!');
                }
                resolve(true);
            }
            if (error) {
                console.log(error);
                resolve(false);
            }
        });
    })
}

function settle(sellerAddress, finalPrice, lastRound, proposeSettleId) {
    let txn = {
        "from": recovered_account.addr,
        "to": sellerAddress,
        "fee": params.fee,
        "amount": finalPrice,
        "firstRound": params.lastRound,
        "lastRound": lastRound,
        "note": util.convertToUint8Array(JSON.stringify({
            "type": "Settle",
            "prevTx": proposeSettleId
        })),
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64
    };

    //sign the transaction
    let signedTxn = algo.signTransaction(txn, recovered_account.sk);
    return new Promise((resolve, reject) => {
        request({
            url: 'https://localhost/settleREC',
            body: JSON.stringify({
                algoTx: Buffer.from(signedTxn.blob)
            }),
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
                fs.appendFile('settledTransactions.txt', JSON.parse(body).txId + "\n", function (err) {
                    if (err)
                        console.log(err);
                    resolve("Settled transaction was successful and saved!\n");
                });
            }else{
                console.log("There was an issue settling!");
            }
        });
    });
}
function checkBidWon(bidId) {
    return new Promise ((resolve, reject) => {request({
            url: 'https://localhost/checkBidWon',
            qs : {bidId : bidId},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                resolve(JSON.parse(body));
            }
            if (error) {
                console.log(error);
                reject(error);
            }
        });}
    );
}


function isPropSettleValid(propSettle, propSettles, params){
    for(let propSettleCheck of propSettles){
        if(propSettleCheck.tx['last-round'] >= propSettle.tx.round && propSettleCheck.tx.round < propSettle.tx.round
            && propSettleCheck.tx['last-round'] >= params.lastRound  && propSettleCheck.tx.round < params.lastRound){
            return false;
        }
    }
    return true;
}


console.log(
    chalk.green(
        figlet.textSync('REC Buyer App', { horizontalLayout: 'full' })
    )
);

getBuyerAddr();

(async () => {
    try {
        params = getParams();
        const choice = await prompts.bidOrSettle();
        if (choice.bidOrSettle == 'bid') {
            let optionsForRes = await showListings();
            let chosenListing = await prompts.chooseListing(optionsForRes);
            let listingInfo = await getListingInfo(JSON.parse(chosenListing.listingChoice).id,
                JSON.parse(chosenListing.listingChoice).sellerAddr);
            let isOkay = await validateListing(JSON.parse(listingInfo));
            if (isOkay) {
                console.log("Listing is Okay!");
                let listingOfInterest = listings[JSON.parse(chosenListing.listingChoice).id];
                let bidAmount = await prompts.bid(JSON.parse(Buffer.from(listingOfInterest.tx.note).toString()).minPrice);
                let bidInfo  = await bid(bidAmount.bid, listings[JSON.parse(chosenListing.listingChoice).id]);
                console.log(bidInfo);
                fs.appendFileSync("saveBids.txt", "\n" + JSON.stringify({id: JSON.parse(bidInfo).txId,
                    amount: bidAmount, listing: JSON.parse(chosenListing.listingChoice)}));
            } else {
                process.exit(1);
            }
        } else {
            let bidOptions = [];
            if(fs.existsSync("saveBids.txt")){
                bidOptions = fs.readFileSync("saveBids.txt");
                bidOptions = bidOptions.toString().split("\n");
                bidOptions = bidOptions.slice(1)
            }
            let chosenBid = await prompts.chooseBid(bidOptions);
            let propSettles = await checkBidWon(JSON.parse(chosenBid.bidChoice).id);
            if(propSettles.length === 0){
                console.log("Your bid has not been chosen yet!");
            }else {
                let propSettle;
                for(propSettle of propSettles) {
                    if(params.lastRound < propSettle.tx['last-round']
                        && isPropSettleValid(propSettle, propSettles, params)) {
                        console.log("There is non-expired propose settle!");
                        console.log(JSON.parse(Buffer.from(propSettle.tx.note).toString()));
                        let answer = await prompts.dealOrNoDeal();
                        if(answer.cond === 'yes'){
                            let isOkay = await checkListing(propSettle.tx.tx, propSettle.tx.from);
                            if(isOkay) {
                                console.log(await settle(propSettle.tx.from ,
                                    JSON.parse(Buffer.from(propSettle.tx.note).toString()).finalPrice,
                                    propSettle.tx['last-round'], propSettle.tx.tx));
                            }else{
                                console.log("Something went wrong!");
                            }
                        }
                    }else{
                        console.log("There is expired propose settle or it is not valid!");
                    }
                }
            }
        }
    }catch (e) {
        console.log(e);
    }
})();
