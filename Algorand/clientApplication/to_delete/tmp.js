//Show available cert:
    //bidCert
    // TODO: Check if the prev tx to the Listing is a cert
    // TODO: Check if it is still valid and have a couple more rounds
    // TODO; check if the Cert has already been sold(query API)
    // TODO: get the x509 cert if it is a valid device approved by microsoft

    //Wait some time to see if it is to retire
    //settleCert
//Show settledCerts from this addr:
    //retire

const crypto = require('crypto');
const ecdh = crypto.createECDH('secp256k1');
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const fs = require('fs');
const algo = require('algosdk');
const readline = require('readline');
const request = require('request');
const config = require('./config');
const chalk = require('chalk');
const figlet = require('figlet');

let mnemonicSeller = "";
let recovered_account;
let params;
let listings = {};

function convertToUint8Array(value){
    var text = Buffer.from(value);
    var retArray = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) retArray[i] = text[i];
    return retArray;
}

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
    //TODO: Show only if still valid(round)
    request({
        url: 'https://localhost/showListings',
        qs : {owner : recovered_account.addr},
        strictSSL: false
    }, function (error, response, body) {
        if(error){
            console.log(error);
        }
        if (!error && response.statusCode == 200) {
            console.log("\nAvailable listings for you:");
            arrListings = JSON.parse(body);
            arrListings.forEach(listing => {
                console.log("Listing: ");
                console.log(listing);
                listings[listing.txId] = listing;
                console.log("\n");
            });
            askUserOpt1();
        }
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


function bidListing() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Type which cert you would like to bid for:", listingId => {
        //TODO: Verify the x509 Certificate
        //Before bidding verify the whole chain
        request({
            url: 'https://localhost/getListingInfo',
            qs : {listingTx: listingId, sender: listings[listingId].addrSender},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let response = JSON.parse(body);
                if(response.listing.from !== response.cert.owner){
                    console.log("Error!");
                    console.log('The listing is not from the owner of the certificate!');
                    process.exit(1);
                }
                let copyCert = JSON.parse(JSON.stringify(response.cert));
                delete copyCert.sigDevice;
                let msgToCheck = JSON.stringify(copyCert).replace("{","").replace("}","");

                //check if the certificate was signed by the device
                let signatureDevice = Buffer.from(response.cert.sigDevice, 'base64').toString('hex');
                let pubKeyDevice = ec.keyFromPublic(Buffer.from(response.device.PK_Master, 'base64').toString('hex'),'hex');
                if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
                    console.log("Error!");
                    console.log('The certificate was not approved device!');
                    process.exit(1);
                }

                let dataCopy = JSON.parse(JSON.stringify(response.device));
                delete dataCopy.signRoot;

                if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(),response.device.signRoot, ecdh.getPublicKey())){
                    console.log("Error!");
                    console.log('The device referenced was not signed by utility provider!');
                    process.exit(1);
                }
                // console.log("All checks pass: The device sending the certificate is approved, certificate comes from the device")
                // console.log("And the owner is the one listing the certificate!");
            }
            if (error) {
                console.log(error);
            }
        });
        rl.question("Type how much would you like to bid for:", price => {
            let txn = {
                "from": recovered_account.addr,
                "to": recovered_account.addr,
                "fee": params.fee,
                "amount": 1,
                "firstRound": params.lastRound,
                "lastRound": params.lastRound + 100,
                "note": convertToUint8Array(JSON.stringify({
                    "type": "Bid",
                    "bid": price,
                    "ValidUnitl": params.lastRound + 100,
                    "prevTx": listingId
                })),
                "genesisID": params.genesisID,
                "genesisHash": params.genesishashb64
            };

            //sign the transaction
            var signedTxn = algo.signTransaction(txn, recovered_account.sk);
            request({
                url: 'https://localhost/bidListing',
                body: JSON.stringify({cert: Buffer.from(signedTxn.blob)}),
                strictSSL: false
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                }
                if (error) {
                    console.log(error);
                }
            });
        });
    });
}

function settle(proposal) {
    let proposalObj = JSON.parse(proposal)[0];
    console.log(proposalObj);
    request({
        url: 'https://localhost/getSettleInfo',
        qs : {proposeSettleTx: proposalObj.txId, seller: proposalObj.addrSender, buyer: recovered_account.addr},
        strictSSL: false
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            let response = JSON.parse(body);
            if(response.listing.from !== response.proposeSettle.from){
                console.log("Error!");
                console.log('Propose Settle is not sent from the same address as listing!');
                process.exit(1);
            }
            if(response.bid.from !== recovered_account.addr){
                console.log("Error!");
                console.log('You did not submit the bit referenced by propose settle!');
                process.exit(1);
            }
            console.log("Checks passed!");
        }
        if (error) {
            console.log(error);
        }
    });
    console.log(proposalObj);
    console.log("Feel will be: " + params.fee);
    console.log("+ final price: " + proposalObj.note.finalPrice);
    let txn = {
        "from": recovered_account.addr,
        "to": proposalObj.addrSender,
        "fee": params.fee,
        "amount": proposalObj.note.finalPrice,
        "firstRound": params.lastRound,
        "lastRound": params.lastRound + 100,
        "note": convertToUint8Array(JSON.stringify({
            "type": "Settle",
            "prevTx": proposalObj.txId
        })),
        "genesisID": params.genesisID,
        "genesisHash": params.genesishashb64
    };

    //sign the transaction
    var signedTxn = algo.signTransaction(txn, recovered_account.sk);
    request({
        url: 'https://localhost/settleCert',
        body: JSON.stringify({cert: Buffer.from(signedTxn.blob), toAddr: proposalObj.addrSender, fromAddr: recovered_account.addr}),
        strictSSL: false
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
            var rePattern = new RegExp(/^Settle was published! The transaction was: (.*)$/);
            var settleId = body.match(rePattern);
            fs.appendFile('settledTransactions.txt', settleId[1] + "\n", function (err) {
                if(err)
                    console.log(err);
                console.log("Settled transaction was saved!\n");
            });
        }
        if (error) {
            console.log(error);
        }
    });
}

function checkBidWon() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Type the bid you are interested in(if it has won, you will see a settleProposal):", bidId => {
        request({
            url: 'https://localhost/checkBidWon',
            qs : {bidId : bidId},
            strictSSL: false
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if(JSON.parse(body).length === 1){
                    console.log(JSON.parse(body))
                    rl.question("Are you okay with the conditions?", res => {
                        if(res === "yes"){
                            settle(body);
                        }else{
                            console.log("Ok. Not settlement sent!")
                        }
                    });
                }else{
                    console.log("Unfortunately, your bid is was not chosen or there were multiple proposals!");
                }
            }
            if (error) {
                console.log(error);
            }
        });
    });
}

async function askUserOpt1() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    let response;
    rl.question("Enter 1 to bid for a listing. 2 to see if a particular bid has won(and potentially buy it)!", res =>{
        response = res;
        rl.close();
        if(res === "1") {
            bidListing();
        }else if (res === "2"){
            checkBidWon();
        }else{
            console.log("Unrecognized Input \n");
            process.exit(1);
        }
    });
    return response;
}

//save Bidsyellow
//save Settled
//Before bidding, get the Original Cert, ask for the x509 certificate and check if it valid signed by microsoft
console.log(
    chalk.green(
        figlet.textSync('REC Buyer App', { horizontalLayout: 'full' })
    )
);

getBuyerAddr();
showListings();
params = getParams();
