const algo = require('algosdk');
const crypto = require('crypto');
const fs = require('fs');
const ecdh = crypto.createECDH('secp256k1');
let url = require('url');
let querystring = require('querystring');

const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const owner = "CMQCDYYIYXBAXJTF7YAESXDYBSU6XW7LO3WG7Q2YMWRQRVUQ2CV3KR4CKI";
var x509CertsMap = {};

fs.readFile('keys/prvKey', function (err, data) {
    if(err){
        console.log(err);
    }else {
        ecdh.setPrivateKey(data.toString(),'base64');
    }
});

var token;
var server_ip = "127.0.0.1";
var port;

fs.readFile('../algorandNetwork/portToConnect.txt', function (err, data) {
    if(err){
        console.log(err);
    }else {
        port = data.toString().trim();
    }
});

fs.readFile('../algorandNetwork/tokenToConnect.txt', function (err, data) {
    if(err){
        console.log(err);
    }else {
        token = data.toString().trim();
    }
});



function convertToUint8Array(value){
    var text = Buffer.from(value);
    var retArray = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) retArray[i] = text[i];
    return retArray;
}

let sendAlgoTransacation = async function(nodeValue){
    var note = convertToUint8Array(nodeValue);

    var mnemonic = fs.readFileSync('../algorandNetwork/mnemonicUtilProvider.txt', 'utf8').trim();
    var recoveredAccount = algo.mnemonicToSecretKey(mnemonic);

    let algodclient = new algo.Algod(token, server_ip, port);
    let tx;

    return await (async() => {
        //Get the relevant params from the algod
        let params = await algodclient.getTransactionParams();
        let endRound = params.lastRound + parseInt(1000);
        //create a transaction
        //note that the closeRemainderTo parameter is commented out
        //This parameter will clear the remaining funds in an account and
        //send to the specified account if main transaction commits
        let txn = {
            "from": recoveredAccount.addr,
            "to": "7BCLPERQVMNQUB4YLST544FFWI3QGICUOGZFOVR7YJWP72F5DATGBJLVBU",
            "fee": 10,
            "amount": 100000,
            "firstRound": params.lastRound,
            "lastRound": endRound,
            "genesisID": params.genesisID,
            "genesisHash": params.genesishashb64,
            "note": note,
            //"closeRemainderTo": "IDUTJEUIEVSMXTU4LGTJWZ2UE2E6TIODUKU6UW3FU3UKIQQ77RLUBBBFLA"
        };
        //sign the transaction
        let signedTxn = algo.signTransaction(txn, recoveredAccount.sk);
        //submit the transaction
        tx = (await algodclient.sendRawTransaction(signedTxn.blob));
        console.log("Transaction : " + tx.txId);
        return tx.txId;
    })().catch(e => {
        console.log(e);
        return -1;
    });
};

let calculateDistance = function(meter1,meter2){
    let meter1Obj = JSON.parse(meter1);
    let meter2Obj = JSON.parse(meter2);
    let xDist = meter1Obj.gpsLatittude - meter2Obj.gpsLatittude;
    let yDist = meter1Obj.gpsLongtitude - meter2Obj.gpsLongtitude;
    return Math.sqrt(Math.pow(xDist,2) + Math.pow(yDist,2));
};

let findClosePKs = async function(data){
    let algodclient = new algo.Algod(token, server_ip, port);
    let closeKeys = [];
    let params = await algodclient.getTransactionParams();
    let maxDistance = 10000000000;

    mainloop:
        for( let i = params.lastRound; i > (params.lastRound - 100) && i >= 0; i--) {
            let block = await (algodclient.block(i));

            if (block.txns.transactions === undefined) {
                continue;
            } else {
                var length = block.txns.transactions.length;
            }
            let txcn = length;

            for (let j = 0; j < txcn; j++) {
                if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                    let textedJson = JSON.stringify(block.txns.transactions[j], undefined, 4);
                    // console.log(textedJson);
                    // console.log(block.txns.transactions[j].note.toString());
                    let dist;
                    try {
                        dist = calculateDistance(data, block.txns.transactions[j].note.toString());
                    }catch(err){
                        dist = NaN;
                    }
                    //console.log(dist);
                    if (dist === NaN) {
                        continue;
                    }
                    if (dist <= maxDistance) {
                        // console.log("Here");
                        closeKeys.push({"dist": dist, "transaction": JSON.parse(block.txns.transactions[j].note.toString())});

                        let curMaxDistance = 0;
                        let maxDistanceIdx = 0;
                        for (let i = 0; i < closeKeys.length; i++) {
                            if (curMaxDistance < closeKeys[i].dist) {
                                maxDistanceIdx = i;
                                curMaxDistance = closeKeys[i].dist;
                            }
                        }
                        if (closeKeys.length > 4) {
                            //console.log("Furthest: " + closeKeys[maxDistanceIdx]);
                            closeKeys.splice(maxDistanceIdx, 1);
                            maxDistance = curMaxDistance;
                        }
                    }
                }
            }

        }
        // console.log(closeKeys);
    return JSON.stringify(closeKeys);
};

let getTx = async function(txIDToLookFor){
    let algodclient = new algo.Algod(token, server_ip, port);
    let params = await algodclient.getTransactionParams();

    mainloop:
        for( let i = params.lastRound; i > (params.lastRound - 100) && i >= 0; i--) {
            let block = await (algodclient.block(i));

            if (block.txns.transactions === undefined) {
                continue;
            } else {
                var length = block.txns.transactions.length;
            }
            let txcn = length;

            for (let j = 0; j < txcn; j++) {
                if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length && block.txns.transactions[j].txId == txIDToLookFor) {
                    return block.txns.transactions[j];
                }
            }

        }
    return "Not Found";
};


//register should just return the 10 closes microcontrollerse
let register = async function(response, request, postData) {
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    console.log(request.socket.getPeerCertificate(true));
    console.log(request.socket.getPeerCertificate(true).issuerCertificate.issuerCertificate.issuerCertificate);
    console.log(request.socket.getPeerCertificate(true).issuerCertificate.issuerCertificate.issuerCertificate.raw);
    let derCert = request.socket.getPeerCertificate(true).issuerCertificate.issuerCertificate.issuerCertificate.raw;
    let pemCert = '-----BEGIN CERTIFICATE-----\n' + derCert.toString('base64').match(/.{0,64}/g).join('\n') + '-----END CERTIFICATE-----';
    fs.writeFile('rootCA.pem',pemCert, (err) =>{
            if(err) console.log(err);
            console.log("Saved");
        }
    );

    // let pem = require('pem');
    // pem.verifySigningChain(request.socket.getPeerCertificate(false), caCert, function (err, res) {
    //     if(err){
    //         console.log(err)
    //     }else {
    //         console.log("Success: " + res);
    //     }
    // });

    // console.log(request.socket.getPeerCertificate(false).raw.toString());
    // console.log("Post data as a string: " + postData);
    // console.log(convertToUint8Array(request.socket.getPeerCertificate(false).raw.toString()));

    let dataToSend = JSON.parse(postData);

    //Hashing Certificate
    let hash = crypto.createHash('sha256');
    if (request.socket.getPeerCertificate(false).raw === undefined) {
        hash.update(""); //telling the hash function whaJSON.stringify(t to hash
        dataToSend.certHash = hash.digest('base64');//Hashing the client certificate
        x509CertsMap[dataToSend.certHash] = "";
    }else {
        hash.update(request.socket.getPeerCertificate(false).raw.toString()); //telling the hash function what to hash
        dataToSend.certHash = hash.digest('base64');//Hashing the client certificate
        x509CertsMap[dataToSend.certHash] = request.socket.getPeerCertificate(false).raw;
    }
    // console.log("Data received");
    // console.log(dataToSend);

    //Signing the Message with root Private Key - ECDSA
    var hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(dataToSend)).digest();
    var signature = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
    dataToSend.signRoot = signature;


    var keys = await findClosePKs(JSON.stringify(dataToSend));
    console.log("Keys" + keys);
    console.log("Post data as a string: " + JSON.stringify(dataToSend));
    let txId = await sendAlgoTransacation(JSON.stringify(dataToSend));
    // response.write(JSON.stringify({"closeKeys": JSON.parse(keys), "prevTx" : txId , "status":"You successfully registered!"}));
    response.write(JSON.stringify({"prevTx" : txId , "owner" : owner, "status":"You successfully registered!"}));
    response.end();
};

let requestTransactions = async function(response, request, postData){
    var mnemonic = "survey wolf bread injury extra initial leopard promote dumb stable high chat dwarf tribe mule fruit elder zone term parrot bunker planet snake ability stomach";
    var recoveredAccount = algo.mnemonicToSecretKey(mnemonic);


    let algodclient = new algo.Algod(token, server_ip, port);


    (async () => {
        let params = await algodclient.getTransactionParams();
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        mainloop:
            for( let i = params.lastRound; i > (params.lastRound - 100) && i >= 0; i--){
                let block = (await algodclient.block(i));
                if(block.txns.transactions === undefined){
                    continue;
                }else {
                    var length = block.txns.transactions.length;
                }
                // console.log(block);
                /////console.log("Number of Transactions: " + length);
                let txcn = length;

                for( let j=0; j < txcn; j++){
                    // console.log(block.txns.transactions[j]);
                     if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                         /////console.log(block.txns.transactions[j].note.toString());
                         response.write("Transaction(block " + i + ") fee:" + block.txns.transactions[j].fee + " amount: " + block.txns.transactions[j].payment.amount+ ": " + block.txns.transactions[j].note.toString() + "\n");
                    }
                }

            }
        response.end();
    })().catch(e => {
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("error!");
        response.end();
        console.log(e);
    });
};

let _reqTxsByType = async function(type){
    let algodclient = new algo.Algod(token, server_ip, port);
    let txs = [];

    await (async () => {
        let params = await algodclient.getTransactionParams();
        mainloop:
            for( let i = params.lastRound; i > (params.lastRound - 10000) && i >= 0; i--){
                let block = (await algodclient.block(i));
                let length;
                if(block.txns.transactions === undefined){
                    continue;
                }else {
                     length = block.txns.transactions.length;
                }
                // console.log(block);
                /////console.log("Number of Transactions in block " + i + ": " + length);
                let txcn = length;

                for( let j=0; j < txcn; j++){
                    if (undefined !== block.txns.transactions[j].note && block.txns.transactions[j].note.length) {
                        try {
                            let noteObj = JSON.parse(block.txns.transactions[j].note.toString());
                            // console.log(block.txns.transactions[j]);
                            // console.log({"txId": block.txns.transactions[j].tx , "note" : noteObj});
                            //TODO: Check if it is the certificate form using schemas
                            if(noteObj.type === type){
                                txs.push({"txId": block.txns.transactions[j].tx , "addrSender": block.txns.transactions[j].from , "note" : noteObj});
                            }
                        }catch (err) {
                            /////console.log("Tx note is not an object. It is not a relevant transaction");
                        }
                    }
                }

            }
    })().catch(e => {
        console.log("Error getting transactions!");
    });
    return txs;
};

var newCert = async function(response, request, postData){
    //TODO: Check if is if formatted the appropriate way
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    if(JSON.parse(postData).prevTx === ""){
        console.log("The device has not be registered yet!")
    }else {
        // let algodclient = new algo.Algod(token, server_ip, port);
        // let mnemonic = fs.readFileSync('../algorandNetwork/mnemonicUtilProvider.txt', 'utf8').trim();
        // let recoveredAccount = algo.mnemonicToSecretKey(mnemonic);
        // let txDevice = await algodclient.transactionInformation(recoveredAccount.addr, JSON.parse(postData).prevTx);
        // let txDeviceObj = JSON.parse(txDevice.note.toString());
        // let copyCert = JSON.parse(postData);
        // delete copyCert.sigDevice;
        // try {
        //     let msgToCheck = JSON.stringify(copyCert).replace("{","").replace("}","");
        //     console.log(Buffer.from(JSON.parse(postData).sigDevice, 'base64'));
        //     console.log(Buffer.from(JSON.parse(postData).sigDevice, 'base64').toString('hex'));
        //     console.log(txDeviceObj.signRoot)let copyCert = JSON.parse(postData);;
        //     console.log(sig(Buffer.from(JSON.parse(postData).sigDevice, 'base64').toString('hex')));
        //     let data = Buffer.from(JSON.parse(postData).sigDevice, 'base64').toString('hex');
        //     console.log(Buffer.from(txDeviceObj.PK_Master, 'base64').toString('hex'));
        //     let pubKey = ec.keyFromPublic(Buffer.from(txDeviceObj.PK_Master, 'base64').toString('hex'),'hex');
        //     console.log(ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), data, pubKey));
        // }catch (err) {
        //     console.log(err);
        // }
        await sendAlgoTransacation(postData);
    }
    response.write(JSON.stringify({"status":"You successfully submitted a cert!"}));
    response.end();
};

var showAvailableCerts = async function(response, request, postData){
    let certs = await _reqTxsByType("Cert");
    let relevantCerts = [];
    // console.log(certs);
    var getArgs = querystring.parse(url.parse(request.url).query);
    certs.forEach(cert => {
        if(cert.note.owner === getArgs.owner){
            relevantCerts.push(cert);
        }
    });
    // console.log(relevantCerts);
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(relevantCerts));
    response.end();
};

var checkBidWon = async function(response, request, postData){
    let proposeSettles = await _reqTxsByType("proposeSettle");
    let relevantProposals = [];
    // console.log(certs);
    var getArgs = querystring.parse(url.parse(request.url).query);
    proposeSettles.forEach(proposeSettle => {
        if(proposeSettle.note.prevTx === getArgs.bidId){
            relevantProposals.push(proposeSettle);
        }
    });
    // console.log(relevantCerts);
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(relevantProposals));
    response.end();
};

var getBids = async function(response, request, postData){
    let bids = await _reqTxsByType("Bid");
    let relevantBids = [];
    // console.log(certs);
    var getArgs = querystring.parse(url.parse(request.url).query);
    bids.forEach(bid => {
        if(bid.note.prevTx === getArgs.listing){
            relevantBids.push(bid);
        }
    });
    // console.log(relevantCerts);
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(relevantBids));
    response.end();
};

var getParams = async function(response, request, postData){
    let algodclient = await new algo.Algod(token, server_ip, port);
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(await  algodclient.getTransactionParams()));
    response.end();
};

var listCert = async function(response, request, postData){
    try {
        let algodclient = await new algo.Algod(token, server_ip, port);
        let tx = await algodclient.sendRawTransaction(convertToUint8Array(JSON.parse(postData).cert));
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Certificate was listed! The transaction was: " + tx.txId);
        response.end();
    }catch(err){
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Certificate was not listed! Err: " + err);
        response.end();
    }
};

var bidListing = async function(response, request, postData) {
    try {
        let algodclient = await new algo.Algod(token, server_ip, port);
        let tx = await algodclient.sendRawTransaction(convertToUint8Array(JSON.parse(postData).cert));
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Bid was published! The transaction was: " + tx.txId);
        response.end();
    }catch(err){
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Bid failed! Err: " + err);
        response.end();
    }
};

var proposeSettle = async function(response, request, postData) {
    try {
        let algodclient = await new algo.Algod(token, server_ip, port);
        let tx = await algodclient.sendRawTransaction(convertToUint8Array(JSON.parse(postData).cert));
        console.log(tx);
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Propose Settle was published! The transaction was: " + tx.txId);
        response.end();
    }catch(err){
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Propose Settle failed! Err: " + err);
        response.end();
    }
};
var settleCert = async function(response, request, postData) {
    try {
        var mnemonic = fs.readFileSync('../algorandNetwork/mnemonicUtilProvider.txt', 'utf8').trim();
        var recoveredAccount = algo.mnemonicToSecretKey(mnemonic);
        let algodclient = await new algo.Algod(token, server_ip, port);

        let tx = await algodclient.sendRawTransaction(convertToUint8Array(JSON.parse(postData).cert));
        let sentTxObj = algo.decodeObj(Buffer.from(JSON.parse(postData).cert));
        console.log("here");
        console.log(sentTxObj);
        let txPropSettle = await algodclient.transactionInformation(JSON.parse(postData).toAddr, JSON.parse(sentTxObj.txn.note.toString()).prevTx);
        let txPropSettleObj = JSON.parse(txPropSettle.note.toString());
        let txBid = await algodclient.transactionInformation(JSON.parse(postData).fromAddr, txPropSettleObj.prevTx);
        let txBidObj = JSON.parse(txBid.note.toString());
        let txList = await algodclient.transactionInformation(JSON.parse(postData).toAddr, txBidObj.prevTx);
        let txListObj = JSON.parse(txList.note.toString());
        let txCert = await algodclient.transactionInformation(recoveredAccount.addr, txListObj.prevTx);
        let txCertObj = JSON.parse(txCert.note.toString());
        let txDevice = await algodclient.transactionInformation(recoveredAccount.addr, txCertObj.prevTx);
        let txDeviceObj = JSON.parse(txDevice.note.toString());

        //TODO: add to saved retired certs!
        //TODO: Check if the settle has been sent after the transaction propose settle has expired
        if(txPropSettleObj.finalPrice != sentTxObj.txn.amt){
            console.log("Error!");
            throw new Error('Settle transaction does not transfer enough money!');
        }
        if(JSON.parse(postData).fromAddr !== txBid.from){
            console.log("Error!");
            throw new Error('You are not the original bidder!');
        }
        if(txPropSettle.from !== txCertObj.owner){
            console.log("Error!");
            throw new Error('The propose settle is not from the owner of the certificate!');
        }
        if(txList.from !== txCertObj.owner){
            console.log("Error!");
            throw new Error('The listing is not from the owner of the certificate!');
        }

        let copyCert = JSON.parse(JSON.stringify(txCertObj));
        delete copyCert.sigDevice;
        let msgToCheck = JSON.stringify(copyCert).replace("{","").replace("}","");

        //check if the certificate was signed by the device
        let signatureDevice = Buffer.from(txCertObj.sigDevice, 'base64').toString('hex');
        let pubKeyDevice = ec.keyFromPublic(Buffer.from(txDeviceObj.PK_Master, 'base64').toString('hex'),'hex');
        if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
            console.log("Error!");
            throw new Error('The certificate was not approved device!');
        }

        let dataCopy = JSON.parse(JSON.stringify(txDeviceObj));
        delete dataCopy.signRoot;

        //Check if the device is signed by the utility provider
        if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(),txDeviceObj.signRoot, ecdh.getPublicKey())){
            console.log("Error!");
            throw new Error('The device referenced was not signed by utility provider!');
        }

        let approveTx = {type:"approveSettle", cert:txListObj.prevTx, to:JSON.parse(postData).fromAddr};
        var hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(approveTx)).digest();
        var signature = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
        approveTx.signRoot = signature;
        await sendAlgoTransacation(JSON.stringify(approveTx));
        console.log("Settle was approved");

        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Settle was published! The transaction was: " + tx.txId);
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Settle failed! Err: " + err);
        response.end();
    }
};


var getListingInfo = async function(response, request, postData) {
    try {
        let mnemonic = fs.readFileSync('../algorandNetwork/mnemonicUtilProvider.txt', 'utf8').trim();
        let recoveredAccount = algo.mnemonicToSecretKey(mnemonic);
        let algodclient = await new algo.Algod(token, server_ip, port);
        let getArgs = querystring.parse(url.parse(request.url).query);
        let txList = await algodclient.transactionInformation(getArgs.sender, getArgs.listingTx);
        let txListObj = JSON.parse(txList.note.toString());
        let txCert = await algodclient.transactionInformation(recoveredAccount.addr, txListObj.prevTx);
        let txCertObj = JSON.parse(txCert.note.toString());
        let txDevice = await algodclient.transactionInformation(recoveredAccount.addr, txCertObj.prevTx);
        let txDeviceObj = JSON.parse(txDevice.note.toString());
        let x509Cert = x509CertsMap[txDeviceObj.certHash];
        let res = {listing: txList, cert: txCertObj, device: txDeviceObj, x509Cert: x509Cert};//Note: listing is not the note field
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


var getSettleInfo = async function(response, request, postData) {
    try {
        let algodclient = await new algo.Algod(token, server_ip, port);
        let getArgs = querystring.parse(url.parse(request.url).query);
        let txPropSettle = await algodclient.transactionInformation(getArgs.seller, getArgs.proposeSettleTx);
        let txPropSettleObj = JSON.parse(txPropSettle.note.toString());
        let txBid = await algodclient.transactionInformation(getArgs.buyer, txPropSettleObj.prevTx);
        let txBidObj = JSON.parse(txBid.note.toString());
        let txList = await algodclient.transactionInformation(getArgs.seller, txBidObj.prevTx);

        let res = {proposeSettle: txPropSettle, bid:txBid, listing: txList};//Note: listing is not the note field
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


var retireCert = async function(response, request, postData) {
    try {
        var mnemonic = fs.readFileSync('../algorandNetwork/mnemonicUtilProvider.txt', 'utf8').trim();
        var recoveredAccount = algo.mnemonicToSecretKey(mnemonic);
        let algodclient = await new algo.Algod(token, server_ip, port);
        //TODO: Add checks for retire transaction!
        //Util Provider sends transaction approvedRetire.
        let sentTxObj = algo.decodeObj(Buffer.from(JSON.parse(postData).cert));
        // console.log(sentTxObj.txn.snd.toString('base32'));
        let txCert = await algodclient.transactionInformation(recoveredAccount.addr, JSON.parse(sentTxObj.txn.note.toString()).prevTx);
        let txCertObj = JSON.parse(txCert.note.toString());
        let txDevice = await algodclient.transactionInformation(recoveredAccount.addr, txCertObj.prevTx);
        let txDeviceObj = JSON.parse(txDevice.note.toString());

        //TODO: Check if the settle has been sent after the transaction propose settle has expired
        //Check if the owner of the cert
        if(JSON.parse(postData).fromAddr !== txCertObj.owner){
            console.log("Error!");
            throw new Error('You do not own the certificate!');
        }
        //check if the certificate was signed by the device
        let copyCert = JSON.parse(JSON.stringify(txCertObj));
        delete copyCert.sigDevice;
        let msgToCheck = JSON.stringify(copyCert).replace("{","").replace("}","");
        let signatureDevice = Buffer.from(txCertObj.sigDevice, 'base64').toString('hex');
        let pubKeyDevice = ec.keyFromPublic(Buffer.from(txDeviceObj.PK_Master, 'base64').toString('hex'),'hex');
        if(!ec.verify(crypto.createHash('sha256').update(msgToCheck).digest(), signatureDevice, pubKeyDevice)){
            console.log("Error!");
            throw new Error('The certificate was not approved device!');
        }

        //Check if the device is signed by the utility provider
        let dataCopy = JSON.parse(JSON.stringify(txDeviceObj));
        delete dataCopy.signRoot;
        if(!ec.verify(crypto.createHash('sha256').update(JSON.stringify(dataCopy)).digest(), txDeviceObj.signRoot, ecdh.getPublicKey())){
            console.log("Error!");
            throw new Error('The device referenced was not signed by utility provider!');
        }


        let tx = await algodclient.sendRawTransaction(convertToUint8Array(JSON.parse(postData).cert));

        let approveTx = {type:"approveRetire", cert:JSON.parse(sentTxObj.txn.note.toString()).prevTx, to:JSON.parse(postData).fromAddr};
        var hashOfMessage = crypto.createHash('sha256').update(JSON.stringify(approveTx)).digest();
        var signature = ec.sign(hashOfMessage, ecdh.getPrivateKey(), {canonical: true} );
        approveTx.signRoot = signature;
        await sendAlgoTransacation(JSON.stringify(approveTx));
        console.log("Settle was approved");

        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Retire transaction was published! The transaction was: " + tx.txId);
        response.end();
    }catch(err){
        console.log(err);
        response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
        response.write("Retire failed! Err: " + err);
        response.end();
    }
};

var showListings = async function(response, request, postData) {
    let listings = await _reqTxsByType("Listing");
    response.writeHead(200, {'Content-Type': 'Content-Type: text/plain'});
    response.write(JSON.stringify(listings));
    response.end();
};




exports.register = register;
exports.requestTransactions = requestTransactions;

exports.newCert = newCert;
exports.showAvailableCerts = showAvailableCerts;
exports.getParams = getParams;
exports.listCert = listCert;
exports.getBids = getBids;
exports.bidListing = bidListing;
exports.showListings = showListings;
exports.proposeSettle = proposeSettle;
exports.checkBidWon = checkBidWon;
exports.settleCert = settleCert;
exports.retireCert = retireCert;
exports.getListingInfo = getListingInfo;
exports.getSettleInfo = getSettleInfo;
