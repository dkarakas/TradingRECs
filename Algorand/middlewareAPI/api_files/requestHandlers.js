const algo = require('algosdk');
const crypto = require('crypto');
const fs = require('fs');
const ecdh = crypto.createECDH('secp256k1');
const process = require('process');
let url = require('url');
let querystring = require('querystring');
let util = require('./util');
let config = require('../config');//has the list of authorized identities that can create RECs
const algoAddress = require('../node_modules/algosdk/src/encoding/address');


const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
util.readFile(config.private_key).then( privateKey => {ecdh.setPrivateKey(privateKey.toString(),'base64');})

let x509CertsMap = {};
let retiredREC = [];

//Setting the owner address of the test smart meter
for(let i = 0; i < config.auth_devices.length; i++) {
    util.readFile(config.auth_devices[i].ownerLocation).then(owner => {
        config.auth_devices[i].owner = owner;
    }).catch(err => {
        console.log("Cannot find the owner of smart meter!");
        console.log(err);
        process.exit(1)
    });
}


//Algorand connection info
let algodclient;
let tokenPromise = util.readFile(config.algorand.token);
let portPromise = util.readFile(config.algorand.port);
Promise.all([tokenPromise, portPromise])
    .then(result => {algodclient = new algo.Algod(result[0], config.algorand.algorandIP, result[1]);})
    .catch(err => {
        console.log("Cannot connect to Algorand!");
        console.log(err);
        process.exit(1)});


let energyCompanyAccount;//NOTE: Energy company and REC Aggregator is used interchangeably here but they are the same.
util.readFile(config.mnemonic.energyCompanyAccount)
    .then(mnemonic => {
        energyCompanyAccount = algo.mnemonicToSecretKey(mnemonic)})
    .catch(err => {
        console.log("Cannot get the Algorand account of the REC aggregator!");
        console.log(err);
        process.exit(1)});

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

if(fs.existsSync("retiredRECs.txt")){
    let RECs = fs.readFileSync("retiredRECs.txt");
    retiredREC = RECs.toString().split("\n");
}

/**
 * Sends Algorand transactions as REG aggregator
 * @param {string} transactionNote - would be either a registration message, a REC, or any transaction that is an approval
 * @param {string} receiverAddr - the receiver address.
 */
let sendAlgoTransaction = async function(transactionNote, receiverAddr){
    var note = util.convertToUint8Array(transactionNote);//Note: can use algosdk.decodeObj
    let tx;
    return await (async() => {
        let params = await algodclient.getTransactionParams();
        let txn = {
            "from": energyCompanyAccount.addr,
            "to": receiverAddr,
            "fee": 10,//or set to the recommended fee
            "amount": 0,
            "firstRound": params.lastRound,
            "lastRound":  params.lastRound + 1000,
            "genesisID": params.genesisID,
            "genesisHash": params.genesishashb64,
            "note": note,
        };
        let signedTxn = algo.signTransaction(txn, energyCompanyAccount.sk);
        tx = (await algodclient.sendRawTransaction(signedTxn.blob));
        console.log("Transaction : " + tx.txId);
        return tx.txId;
    })().catch(e => {
        throw Error(e);
    });
};

/**
 * Gets all Agorand transaction with specific type(Internal)
 * @param {string} transactionNote - the type of transaction to get from Algorand such as "REC"
 */

let _reqTxsByType = async function(type){
    let txs = [];

    await (async () => {
        let params = await algodclient.getTransactionParams();
        for( let i = params.lastRound; i > (params.lastRound - 100) && i >= 0; i--){//Scan the last 100 transactions.
            // More efficient solution would be to keep state instead.
            let block = (await algodclient.block(i));
            if(block.txns.transactions === undefined){
                continue;
            }
            let txcn = block.txns.transactions.length;
            for( let j=0; j < txcn; j++){
                if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                    try {
                        let noteObj = JSON.parse(block.txns.transactions[j].note.toString());
                        //could just use directly the transaction
                        if(noteObj.type === type){
                            txs.push({tx: block.txns.transactions[j]});
                        }
                    }catch (err) {
                        //The Algo transaction is not relevent to our implementation since it does not have a type.
                        //Therefore ignore.
                        //However, a real world implementation can check against a scheme
                    }
                }
            }

        }
    })().catch(e => {
        console.log(e);
        console.log("Error occurred when searching for transactions of specific type!");
    });
    return txs;
};

/**
 * Handles Smart Meter registration by verifying its X.509 cert, its authorization, and signature.
 * We make the simplification that there is only one REC aggregator.
 */
let infoUpdate = async function(response, request, postData) {
    let idOfDevice = -1;
    //Note: real-world implementation would perform more checks with respect to the content of the metadata

    //Verify X509 Cert (using openssl wrapper)
    let clientCert = util.rawToPem(request.socket.getPeerCertificate(true).raw);

    try {
        await util.verifySigningChain(clientCert, listRootCAs);
    }catch (e){
        console.log(e);
        response.writeHead(404);
        response.end();
        return;
    }

    //Checking if authorized smart meter is sending the request
    for(var i = 0; i < config.auth_devices.length; i++) {
        if (config.auth_devices[i].id == request.socket.getPeerCertificate(true).subject.CN) {
            idOfDevice = i;
            break;
        }
    }

    if(idOfDevice == -1){
        response.writeHead(401);
        response.write("Unauthorized smart meter!");
        response.end();
	return;
    }

    let metadataUpdate = JSON.parse(postData);
    if(config.auth_devices[i].PK_Master != metadataUpdate.PK_Master){
	response.writeHead(401);
        response.write("Smart meter identity is not added!");	
	console.log("SM with identity " + metadataUpdate.PK_Master + " attempted to update its info");
	console.log("If authorized, please add the SM to config!");
	response.end();
	return;
    }

    //Checking the signature of the update transaction
    // console.log(postData);
    let metadataUpdateCopy = JSON.parse(postData);
    delete metadataUpdate.signature;
    console.log(metadataUpdateCopy);
    let signatureInfo = Buffer.from(metadataUpdateCopy.signature, "base64").toString("hex");
    let pubKeyDevice = ec.keyFromPublic(Buffer.from(metadataUpdate.PK_Master, 'base64').toString('hex'),'hex');
    if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(metadataUpdate).replace("{","").replace("}","")).digest(),
         signatureInfo, pubKeyDevice)){
	 console.log("Sig failed");
         response.writeHead(404);
         response.end();
         return;
    }

    //Signing update using REC aggregator key as an approval
    let dataToSend = JSON.parse(postData);
    let hash = crypto.createHash('sha256');
    if (request.socket.getPeerCertificate(false).raw) {
        hash.update(request.socket.getPeerCertificate(false).raw.toString());
        dataToSend.certHash = hash.digest('base64');
        x509CertsMap[dataToSend.certHash] = request.socket.getPeerCertificate(false).raw;
    }

    let hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(dataToSend)).digest();
    let signature = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
    dataToSend.signRECaggregator = signature;

    let txId;
    try {
        txId = await sendAlgoTransaction(JSON.stringify(dataToSend), energyCompanyAccount.addr);
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify({"prevTx" : txId ,
            "owner" : config.auth_devices[idOfDevice].owner,
            "status":"You successfully registered!"}));
        response.end();
    }catch (e) {
        console.log("Could not send an Algorand transaction!");
        response.writeHead(404);
        response.end();
    }
};

/**
 * New RECs are added to the blockchain
 */
let newREC = async function(response, request, postData){

    // No need to verify the X.509 cert since it has valid registration transaction
    let metadataTx;
    let txId;
    console.log(postData)
    try {
        metadataTx = await algodclient.transactionInformation(energyCompanyAccount.addr, JSON.parse(postData).prevTx);
    }catch (e){
        console.log("Could not find the renewable energy generator info update transaction for the smart meter!");
        console.error(e);
        response.writeHead(404);
        response.end();
        return;
    }
    let metadataUpdate = JSON.parse(metadataTx.note.toString());
    try{
        let signature =  metadataUpdate.signRECaggregator;
        delete metadataUpdate.signRECaggregator;
        if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(metadataUpdate)).digest(),
            signature, ecdh.getPublicKey())){
            console.error("Renewable energy generator info update transaction signature verification fail!");
            response.writeHead(404);
            response.end();
            return;
        }
    }catch (e) {
        console.log("Renewable energy generator info update transaction was not signed by a REC aggregator!");
        console.error(e);
        response.writeHead(404);
        response.end();
        return;
    }
    let REC = JSON.parse(postData);
    try {
        let signature = Buffer.from(REC.sigDevice, "base64").toString("hex");
        delete REC.sigDevice;
        let RECCopy = JSON.stringify(REC).replace("{","").replace("}","");
        let pubKey = ec.keyFromPublic(Buffer.from(metadataUpdate.PK_Master, 'base64').toString('hex'),'hex');
        if(!ec.verify(crypto.createHash('sha256').update(RECCopy).digest(), signature, pubKey)){
            console.error("REC signature verification fail!");
            response.writeHead(404);
            response.end();
            return;
        }
    }catch (e) {
        console.log("REC was not signed by the smart meter!");
        console.error(e);
        response.writeHead(404);
        response.end();
    }
    try {
        txId = await sendAlgoTransaction(postData, REC.owner);
    }catch (e) {
        console.log("Could not submit the REC!");
        console.error(e);
        response.writeHead(404);
        response.end();
    }

    response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
    response.write(JSON.stringify({status:"You successfully submitted a REC!", id: txId}));
    response.end();
};

/**
 * Returns the transactions in the last 1000 Algo blocks.
 * It is used by the helper scripts
 */
let requestTransactions = async function(response, request, postData){
    let ret = "";
    (async () => {
        let params = await algodclient.getTransactionParams();
        for( let i = params.lastRound; i > (params.lastRound - 1000) && i >= 0; i--){
            let block = (await algodclient.block(i));
            if(block.txns.transactions === undefined){
                continue;
            }
            let txcn = block.txns.transactions.length;
            for( let j=0; j < txcn; j++){
                 if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                     ret += "Transaction(block " + i + ") fee:" + block.txns.transactions[j].fee +
                         " amount: " + block.txns.transactions[j].payment.amount+ ": " +
                         block.txns.transactions[j].note.toString() + "\n";
                }
            }

        }
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(ret);
        response.end();
    })().catch(e => {
        response.writeHead(404);
        response.end();
        console.error(e);
    });
};


let showAvailableRECs = async function(response, request, postData){
    let RECs;
    try{
        RECs = await _reqTxsByType("REC");
    }catch (e) {
        response.writeHead(404);
        response.end();
    }
    let relevantRECs = [];
    let getArgs = querystring.parse(url.parse(request.url).query);
    RECs.forEach(REC => {
        if(JSON.parse(Buffer.from(REC.tx.note).toString()).owner === getArgs.owner && !retiredREC.includes(REC.tx.tx)){
            relevantRECs.push(REC);
        }
    });
    response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
    response.write(JSON.stringify(relevantRECs));
    response.end();
};


/**
 * Essentially checks if any of the proposeSettle transactions are referencing the bid of interest.
 */
let checkBidWon = async function(response, request, postData){
    let proposeSettles;
    try{
        proposeSettles = await _reqTxsByType("proposeSettle");
    }catch (e) {
        response.writeHead(404);
        response.end();
    }
    let relevantProposals = [];
    let getArgs = querystring.parse(url.parse(request.url).query);
    proposeSettles.forEach(proposeSettle => {
        if(JSON.parse(Buffer.from(proposeSettle.tx.note).toString()).prevTx === getArgs.bidId){
            relevantProposals.push(proposeSettle);
        }
    });
    response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
    response.write(JSON.stringify(relevantProposals));
    response.end();
};

var getBids = async function(response, request, postData){
    let bids;
    try {
        bids = await _reqTxsByType("Bid");
    }catch (e) {
        response.writeHead(404);
        response.end();
        return;
    }
    let relevantBids = [];
    var getArgs = querystring.parse(url.parse(request.url).query);
    if(!retiredREC.includes(getArgs.RECId)) {
        for(let bid of bids){
            let account = await algodclient.accountInformation(bid.tx.from);
            let bidObj = JSON.parse(Buffer.from(bid.tx.note).toString());
            if (bidObj.prevTx === getArgs.listing && bidObj.bid <= account.amount) {
                relevantBids.push(bid);
            }
        }
    }

    if(relevantBids.length !== 0){
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify(relevantBids));
        response.end();
    }else{
        response.writeHead(404);
        response.write("Either the REC was sold or no bids are available");
        response.end();
    }
};

var getParams = async function(response, request, postData){
    try {
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify(await algodclient.getTransactionParams()));
        response.end();
    }catch (e) {
        console.log(e);
        response.writeHead(404);
        response.end();
    }
};

/**
 * Allows any listing transaction to be submitted since it has to be check anyways before settling.
 */
var listREC = async function(response, request, postData){
    try {
        let tx = await algodclient.sendRawTransaction(util.convertToUint8Array(JSON.parse(postData).algoTx));
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify({"status" : "Certificate was listed! The transaction was: " + tx.txId,
            "txId" : tx.txId}));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};

/**
 * Allows any bid transaction to be submitted since it has to be check anyways before settling. Check there are at
 * least sufficient funds for the bid.
 */
var bidListing = async function(response, request, postData) {
    try {
        let bidTx = algo.decodeObj(Buffer.from(JSON.parse(postData).algoTx, "base64"));
        console.log(bidTx);
        let account = await algodclient.accountInformation(algoAddress.encode(bidTx.txn.snd));
        if(account.amount < JSON.parse(bidTx.txn.note.toString()).bid){
            throw Error("Insufficient funds!");
        }
        let tx = await algodclient.sendRawTransaction(util.convertToUint8Array(JSON.parse(postData).algoTx));
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify({"status" : "Bid was published! The transaction was: " + tx.txId,
            "txId" : tx.txId}));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};

/**
 * Allows any proposeSettle transaction to be submitted since it has to be check anyways before settling.
 */
var proposeSettle = async function(response, request, postData) {
    try {
        let tx = await algodclient.sendRawTransaction(util.convertToUint8Array(JSON.parse(postData).algoTx));
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write(JSON.stringify({"message" : "Propose Settle was published! The transaction was: " + tx.txId,
            "txId" : tx.txId}));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};

var showListings = async function(response, request, postData) {
    let res = [];
    let listings;
    try {
        listings = await _reqTxsByType("Listing");
    }catch (e) {
        console.log(e);
        response.writeHead(404);
        response.end();
        return;
    }
    try {
        for (let listing of listings) {
            let txListObj = JSON.parse(listing.tx.note.toString());
            try {
                let txREC = await algodclient.transactionInformation(energyCompanyAccount.addr, txListObj.prevTx);
                if(!retiredREC.includes(txREC.tx))
                    res.push({listing: listing, REC: txREC})
            }catch (e) {
                console.log("Cannot find the REC(" + txListObj.prevTx + ") for a particular listing!");
            }
        }
    }catch (e) {
        console.log(e);
        response.writeHead(404);
        response.end();
        return;
    }
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(res));
    response.end();
};


var getListingInfo = async function(response, request, postData) {
    try {
        let getArgs = querystring.parse(url.parse(request.url).query);
        let txListing = await algodclient.transactionInformation(getArgs.sender, getArgs.listingTx);
        let txListingObj = JSON.parse(txListing.note.toString());
        let txREC = await algodclient.transactionInformation(energyCompanyAccount.addr, txListingObj.prevTx);
        let txRECObj = JSON.parse(txREC.note.toString());
        let txMetadata = await algodclient.transactionInformation(energyCompanyAccount.addr, txRECObj.prevTx);
        let txMetadataObj = JSON.parse(txMetadata.note.toString());
        let x509Cert = x509CertsMap[txMetadataObj.certHash];
        let res = {listing: txListing, REC: txRECObj, device: txMetadataObj, x509Cert: x509Cert};
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write(JSON.stringify(res));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};


var getSettleInfo = async function(response, request, postData) {
    try {
        let getArgs = querystring.parse(url.parse(request.url).query);
        let txPropSettle = await algodclient.transactionInformation(getArgs.seller, getArgs.proposeSettleTx);
        let txPropSettleObj = JSON.parse(txPropSettle.note.toString());
        let txBid = await algodclient.transactionInformation(getArgs.buyer, txPropSettleObj.prevTx);
        let txBidObj = JSON.parse(txBid.note.toString());
        let txListing = await algodclient.transactionInformation(getArgs.seller, txBidObj.prevTx);

        let res = {proposeSettle: txPropSettle, bid:txBid, listing: txListing};
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write(JSON.stringify(res));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("x509 Cert does not exist");
        response.end();
    }
};

/**
 * Returns the txId of the REC for the proposeSettle
 * @param {Algorand Transaction} settle transaction
 * @return {Promise<*>}
 */
var getRECtxId = async function (txPropSettle, bidderAddr) {
    let txListObj;
    try{
        let txBid = await algodclient.transactionInformation(bidderAddr, JSON.parse(txPropSettle.note.toString()).prevTx);
        let txBidObj = JSON.parse(txBid.note.toString());
        let txList = await algodclient.transactionInformation(txPropSettle.from, txBidObj.prevTx);
        txListObj = JSON.parse(txList.note.toString());
    } catch (e) {
        console.log(e);
    }
    return txListObj.prevTx;// could be null
};
/**
 * The settle REC performs many verifications related to correctness and security.
 * For example, it checks to ensure that there aren't multiple propose Settle transaction
 */
var settleREC = async function(response, request, postData) {
    try {
        let tx = await algodclient.sendRawTransaction(util.convertToUint8Array(JSON.parse(postData).algoTx));
        let txSettleObj = algo.decodeObj(Buffer.from(JSON.parse(postData).algoTx));
        let txPropSettle = await algodclient.transactionInformation(algoAddress.encode(txSettleObj.txn.rcv), JSON.parse(txSettleObj.txn.note.toString()).prevTx);
        let txPropSettleObj = JSON.parse(txPropSettle.note.toString());
        let txBid = await algodclient.transactionInformation(algoAddress.encode(txSettleObj.txn.snd), txPropSettleObj.prevTx);
        let txBidObj = JSON.parse(txBid.note.toString());
        let txList = await algodclient.transactionInformation(algoAddress.encode(txSettleObj.txn.rcv), txBidObj.prevTx);
        let txListObj = JSON.parse(txList.note.toString());
        let txREC = await algodclient.transactionInformation(energyCompanyAccount.addr, txListObj.prevTx);
        let txRECObj = JSON.parse(txREC.note.toString());
        let txMetadata = await algodclient.transactionInformation(energyCompanyAccount.addr, txRECObj.prevTx);
        let txMetadataObj = JSON.parse(txMetadata.note.toString());

        if(retiredREC.includes(txREC.tx)){
            console.log("REC was already retired!");
            return;
        }

        if(txPropSettleObj.finalPrice !== txSettleObj.txn.amt){
            console.log('Settle transaction does not transfer the correct amount of currency!');
            return;
        }

        if(algoAddress.encode(txSettleObj.txn.snd)  !== txBid.from){
            console.log('The sender of settle transaction is not the original bidder!');
            return;
        }

        if(txPropSettle.from !== txRECObj.owner){
            console.log('The propose settle is not from the owner of the REC!');
            return;
        }

        if(txList.from !== txRECObj.owner){
            console.log('The listing is not from the owner of the REC!');
            return;
        }

        if(txBid.round > txList['last-round'] && txBid.round < txList['first-round']){
            console.log('The bid was not submitted before the listing expired!');
            return;
        }

        //check if the propSettle is valid(aka it was a propSettle that has not expired and it is not overlapping)
        try {
            let tmp = await _reqTxsByType("proposeSettle");
            tmp.forEach( propSettleCheck => {
                let RECtxId = getRECtxId(propSettleCheck.tx, algoAddress.encode(txSettleObj.txn.snd));
                if(txListObj.prevTx === RECtxId){
                    if(propSettleCheck.tx['last-round'] >= txPropSettle.round && propSettleCheck.tx.round <= txPropSettle.round){
                        if(txSettleObj.txn.lv <= propSettleCheck.tx['last-round']  && txSettleObj.txn.lv >= propSettleCheck.tx.round){
                            throw Error('The bid was not for the valid listing!');
                        }
                    }
                }
            });
        }catch (e) {
            console.log(e);
            response.writeHead(404);
            response.end();
            return;
        }


        let copyREC = JSON.parse(JSON.stringify(txRECObj));
        delete copyREC.sigDevice;
        let msgToCheck = JSON.stringify(copyREC).replace("{","").replace("}","");

        //check if the REC was signed by the device
        let signatureDevice = Buffer.from(txRECObj.sigDevice, "base64").toString("hex");
        let pubKeyDevice = ec.keyFromPublic(Buffer.from(txMetadataObj.PK_Master, 'base64').toString('hex'),'hex');
        if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
            console.log('The REC was not signed by the device!');
            return;
        }

        let dataCopy = JSON.parse(JSON.stringify(txMetadataObj));
        delete dataCopy.signRECaggregator;

        //Check if the metadata is signed by the REC aggregator
        if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(),txMetadataObj.signRECaggregator, ecdh.getPublicKey())){
            console.log('The device referenced was not signed by REC aggregator!');
            return;
        }

        let approveTx = {type:"approveSettle", REC: txListObj.prevTx, to: algoAddress.encode(txSettleObj.txn.snd)};
        let hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(approveTx)).digest();
        approveTx.signRECaggregator = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
        await sendAlgoTransaction(JSON.stringify(approveTx), energyCompanyAccount.addr);

        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write(JSON.stringify({"message" : "Settle was published! The transaction was: " + tx.txId ,"txId" : tx.txId}));
        response.end();
        retiredREC.push(txREC.tx);//could be substituted with hashtable
        fs.appendFileSync("retiredRECs.txt", "\n" + txREC.tx);
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.write("Error while retiring");
        response.end();
    }
};


var retireREC = async function(response, request, postData) {
    try {
        let txRetireObj = algo.decodeObj(Buffer.from(JSON.parse(postData).algoTx));
        let txREC = await algodclient.transactionInformation(energyCompanyAccount.addr, JSON.parse(txRetireObj.txn.note.toString()).prevTx);
        let txRECObj = JSON.parse(txREC.note.toString());
        let txMetadata = await algodclient.transactionInformation(energyCompanyAccount.addr, txRECObj.prevTx);
        let txMetadataObj = JSON.parse(txMetadata.note.toString());

        if(retiredREC.includes(txREC.tx)){
            console.log("REC was already retired!");
            return;
        }
        //Check if the owner of the cert
        if(algoAddress.encode(txRetireObj.txn.snd) !== txRECObj.owner){
            console.log('You do not own the REC!');
            return;
        }
        //check if the certificate was signed by the device
        let copyREC = JSON.parse(JSON.stringify(txRECObj));
        delete copyREC.sigDevice;
        let msgToCheck = JSON.stringify(copyREC).replace("{","").replace("}","");
        let signatureDevice = Buffer.from(txRECObj.sigDevice, "base64").toString("hex");
        let pubKeyDevice = ec.keyFromPublic(Buffer.from(txMetadataObj.PK_Master, 'base64').toString('hex'),'hex');
        if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
            console.log('The certificate was not signed by the approved device!');
            return;
        }

        //Check if the device is signed by the REC aggregator
        let dataCopy = JSON.parse(JSON.stringify(txMetadataObj));
        delete dataCopy.signRECaggregator;
        if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(), txMetadataObj.signRECaggregator, ecdh.getPublicKey())){
            console.log('The device referenced was not signed by REC aggregator!');
            return;
        }


        let tx = await algodclient.sendRawTransaction(util.convertToUint8Array(JSON.parse(postData).algoTx));
        let approveTx = {type:"approveRetire", REC: JSON.parse(txRetireObj.txn.note.toString()).prevTx, to: algoAddress.encode(txRetireObj.txn.snd) };
        let hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(approveTx)).digest();
        let signature = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
        approveTx.signRECaggregator = signature;
        await sendAlgoTransaction(JSON.stringify(approveTx), energyCompanyAccount.addr);
        console.log("Retire was approved!");

        retiredREC.push(txREC.tx);
        fs.appendFileSync("retiredRECs.txt", "\n" + txREC.tx);

        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write(JSON.stringify({message: "Retire transaction was published! The transaction was: " + tx.txId, txId: tx.txId}));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};

let getAccount = async function(response, request, postData) {
    try {
        let getArgs = querystring.parse(url.parse(request.url).query);
        let account = await algodclient.accountInformation(getArgs.accountAddress);
        response.writeHead(200, {'Content-Type': 'Content-Type: application/json'});
        response.write(JSON.stringify(JSON.stringify(account)));
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(404);
        response.end();
    }
};

exports.metadataUpdate = infoUpdate;
exports.requestTransactions = requestTransactions;

exports.newREC = newREC;
exports.showAvailableRECs = showAvailableRECs;
exports.getParams = getParams;
exports.listREC = listREC;
exports.getBids = getBids;
exports.bidListing = bidListing;
exports.showListings = showListings;
exports.proposeSettle = proposeSettle;
exports.checkBidWon = checkBidWon;
exports.settleREC = settleREC;
exports.retireREC = retireREC;
exports.getListingInfo = getListingInfo;
exports.getSettleInfo = getSettleInfo;
exports.getAccount = getAccount;
