'use strict';
const fs = require('fs');
let https = require('https');
let crypto = require('crypto');
const ecdh = crypto.createECDH('secp256k1');
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const algo = require('algosdk');
const util = require('../../api_files/util');
const async = require('async');
const config = require('../../config');

var getParams = function (callback){
    var options = {
        hostname: 'localhost',
        port: 443,
        path: '/getParams',
        method: 'GET',
        key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
        cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
        ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem')
    };

    var req = https.request(options, function(res) {
        expect(res.statusCode).toBe(200);
        var dataTmp = "";
        res.on('data', function(data) {
            dataTmp += data.toString();
        });
        res.on('end', function() {
            callback(null, dataTmp);
        });

    });
    req.end();
};


describe("Middleware API", function () {
    let pubKey;
    let prvKey;
    let ownerSM;
    let metadataTxid;
    let sentREC;
    let RECTxid;
    let sellerAccount;
    let buyerAccount;
    let energyCompanyAccount;
    let listingTxid;
    let bidTxid;
    let proposeSettleTxid;

    beforeAll(function (done) {
        const cryptoServer = crypto.createECDH('secp256k1');
        pubKey = cryptoServer.generateKeys('base64');
        prvKey = cryptoServer.getPrivateKey('base64');
        ecdh.setPrivateKey(prvKey, 'base64');
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;
        config.auth_devices[0].PK_Master = pubKey;
        fs.writeFileSync("config.json", JSON.stringify(config, null, 4));

        let mnemonicSeller = fs.readFileSync('../algorandNetwork/mnemonicSeller.txt', 'utf8').trim();
        sellerAccount = algo.mnemonicToSecretKey(mnemonicSeller);
        let mnemonicBuyer = fs.readFileSync('../algorandNetwork/mnemonicBuyer.txt', 'utf8').trim();
        buyerAccount = algo.mnemonicToSecretKey(mnemonicBuyer);
        let mnemonicEnergyCompany = fs.readFileSync('../algorandNetwork/mnemonicRECAggregator.txt', 'utf8').trim();
        energyCompanyAccount = algo.mnemonicToSecretKey(mnemonicEnergyCompany);
        console.log("\nStart the middleware with npm start!\n");
        setTimeout(function () {//give some time so that the metadata can be added to the blockchain
            done();
        }, 10000);
        });


    it('should correctly accept smart meter registration ' +
        'if it has X.509 certificate, correct signature, and it is authorized', function (done) {
        let metadataUpdate = {
            "type" : "metadata",
            "PK_Master" : pubKey,
            "gpsLatittude" : Math.floor(Math.random() * Math.floor(100)),
            "gpsLongtitude" : Math.floor(Math.random() * Math.floor(100))
        };
        //Sign Message
        var hashReg = crypto.createHash('sha256').update(JSON.stringify(metadataUpdate).replace("{","").replace("}","")).digest();
        var signature = ec.sign(hashReg, ecdh.getPrivateKey());
        metadataUpdate.signature = Buffer.from(signature.toDER('hex'), 'hex').toString('base64');

        //Send a registration post request with X.509 certificate
        var options = {
            hostname: 'localhost',
            port: 443,
            path: '/metadataUpdate',
            method: 'POST',
            key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
            cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
            ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
            headers: {
                'Content-Type': 'application/json',
                'Content-Length' : JSON.stringify(metadataUpdate).length
            }
        };

        var req = https.request(options, function(res) {
            expect(res.statusCode).toBe(200);
            var dataLoc = "";
            res.on('data', function(data) {
                dataLoc += data.toString();
            });
            res.on('end', function() {
                ownerSM = JSON.parse(dataLoc).owner;
                metadataTxid = JSON.parse(dataLoc).prevTx;
                //Wait to be added on the blockchain
                setTimeout(function () {//give some time so that the metadata can be added to the blockchain
                    done();
                },10000);
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });
        req.write(JSON.stringify(metadataUpdate));
        req.end();

    });


    it('should correctly accept a REC ' +
        'if it has correctly signed registration tx, and REC signature', function (done) {
        let REC = {
            "type" : "REC",
            "powerProdWh" : Math.floor(Math.random() * Math.floor(100)),
            "owner" : ownerSM,
            "prevTx" : metadataTxid
        };
        //Sign Message how it is singed on Azure Sphere
        let RECCopy = JSON.stringify(REC).replace("{","").replace("}","");
        let hashREC = crypto.createHash('sha256').update(RECCopy).digest();
        let signature = ec.sign(hashREC, ecdh.getPrivateKey(), {canonical: true} );
        REC.sigDevice = Buffer.from(signature.toDER('hex'), 'hex').toString('base64');

        sentREC = REC;
        //Send a registration post request with X.509 certificate
        var options = {
            hostname: 'localhost',
            port: 443,
            path: '/newREC',
            method: 'POST',
            key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
            cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
            ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
            headers: {
                'Content-Type': 'application/json',
                'Content-Length' : JSON.stringify(REC).length
            }
        };

        var req = https.request(options, function(res) {
            expect(res.statusCode).toBe(200);
            var dataLoc = "";
            res.on('data', function(data) {
                dataLoc += data.toString();
            });
            res.on('end', function() {
                setTimeout(function () {
                    done();
                },10000);
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });

        req.write(JSON.stringify(REC));
        req.end();

    });


    it('should correctly return RECs owned by the user', function (done) {
        //Send a registration post request with X.509 certificate
        var options = {
            hostname: 'localhost',
            port: 443,
            path: '/showAvailableRECs?owner=' + ownerSM,
            method: 'GET',
            key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
            cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
            ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem')
        };

        var req = https.request(options, function(res) {
            expect(res.statusCode).toBe(200);
            var dataLoc = "";
            res.on('data', function(data) {
                dataLoc += data.toString();
            });
            res.on('end', function() {
                let response = JSON.parse(dataLoc);
                RECTxid = response[0].tx.tx;
                sentREC = JSON.parse(JSON.stringify(sentREC));//To convert the signature in the correct form
                let RECs = [];
                response.forEach( REC => {RECs.push(JSON.parse(Buffer.from(REC.tx.note).toString()))});
                expect(RECs).toContain(sentREC);
                done();
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });

        req.end();

    });

    it('should accept listing of a REC', function (done) {
        async.waterfall([
            function (callback) {
                getParams(callback);
            },
            function (arg1, callback) {
                let params;
                params = JSON.parse(arg1);
                let txn = {
                    "from": sellerAccount.addr,
                    "to": sellerAccount.addr,
                    "fee": params.fee,
                    "amount": 1,
                    "firstRound": params.lastRound,
                    "lastRound": params.lastRound + 100,
                    "note": util.convertToUint8Array(JSON.stringify({
                        "type": "Listing",
                        "minPrice" : 0,
                        "prevTx" : RECTxid
                    })),
                    "genesisID": params.genesisID,
                    "genesisHash": params.genesishashb64
                };
                let signedTxn = algo.signTransaction(txn, sellerAccount.sk);
                let toSend = JSON.stringify({algoTx : Buffer.from(signedTxn.blob)});
                let options = {
                    hostname: 'localhost',
                    port: 443,
                    path: '/listREC',
                    method: 'POST',
                    key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
                    cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
                    ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
                    headers: {
                        'Content-Type': 'application/text',
                        'Content-Length' : toSend.length
                    }
                };
                var req = https.request(options, function(res) {
                    expect(res.statusCode).toBe(200);
                    var dataTmp = "";
                    res.on('data', function(data) {
                        dataTmp += data.toString();
                    });
                    res.on('end', function() {
                        callback(null,dataTmp);
                    });

                });
                req.on('error', function (err) {
                    console.log(err);
                });
                req.write(toSend);
                req.end();
            }
        ],
        function (err,result) {
            listingTxid = JSON.parse(result).txId;
            done();
        });

    });

    it('should accept a bid for a Listing', function (done) {
        async.waterfall([
                function (callback) {
                    getParams(callback);
                },
                function (arg1, callback) {
                    let params;
                    params = JSON.parse(arg1);
                    let txn = {
                        "from": buyerAccount.addr,
                        "to": buyerAccount.addr,
                        "fee": params.fee,
                        "amount": 1,
                        "firstRound": params.lastRound,
                        "lastRound": params.lastRound + 100,//should be set to what the listing end is
                        "note": util.convertToUint8Array(JSON.stringify({
                            "type": "Bid",
                            "bid": 100,
                            "prevTx": listingTxid
                        })),
                        "genesisID": params.genesisID,
                        "genesisHash": params.genesishashb64
                    };

                    //sign the transaction
                    var signedTxn = algo.signTransaction(txn, buyerAccount.sk);
                    let toSend = JSON.stringify({algoTx: Buffer.from(signedTxn.blob)});
                    let options = {
                        hostname: 'localhost',
                        port: 443,
                        path: '/bidListing',
                        method: 'POST',
                        key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
                        cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
                        ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
                        headers: {
                            'Content-Type': 'application/text',
                            'Content-Length' : toSend.length
                        }
                    };
                    var req = https.request(options, function(res) {
                        expect(res.statusCode).toBe(200);
                        var dataTmp = "";
                        res.on('data', function(data) {
                            dataTmp += data.toString();
                        });
                        res.on('end', function() {
                            callback(null,dataTmp);
                        });

                    });
                    req.on('error', function (err) {
                        console.log(err);
                    });
                    req.write(toSend);
                    req.end();
                }
            ],
            function (err,result) {
                bidTxid = JSON.parse(result).txId;
                done();
            });
    });

    it('should accept a propose settle for a Listing', function (done) {
        async.waterfall([
                function (callback) {
                    getParams(callback);
                },
                function (arg1, callback) {
                    let params;
                    params = JSON.parse(arg1);
                    let txn = {
                        "from": sellerAccount.addr,
                        "to": sellerAccount.addr,
                        "fee": params.fee,
                        "amount": 1,
                        "firstRound": params.lastRound,
                        "lastRound": params.lastRound + 100,
                        "note": util.convertToUint8Array(JSON.stringify({
                            "type": "proposeSettle",
                            "minPrice" : 0,
                            "finalPrice" : 100,
                            "prevTx" : bidTxid
                        })),
                        "genesisID": params.genesisID,
                        "genesisHash": params.genesishashb64
                    };
                    //sign the transaction
                    var signedTxn = algo.signTransaction(txn, sellerAccount.sk);
                    let toSend = JSON.stringify({algoTx: Buffer.from(signedTxn.blob)});
                    let options = {
                        hostname: 'localhost',
                        port: 443,
                        path: '/proposeSettle',
                        method: 'POST',
                        key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
                        cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
                        ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
                        headers: {
                            'Content-Type': 'application/text',
                            'Content-Length' : toSend.length
                        }
                    };
                    var req = https.request(options, function(res) {
                        expect(res.statusCode).toBe(200);
                        var dataTmp = "";
                        res.on('data', function(data) {
                            dataTmp += data.toString();
                        });
                        res.on('end', function() {
                            callback(null,dataTmp);
                        });

                    });
                    req.on('error', function (err) {
                        console.log(err);
                    });
                    req.write(toSend);
                    req.end();
                }
            ],
            function (err,result) {
                proposeSettleTxid = JSON.parse(result).txId;
                // done();
                setTimeout(function () {
                    done();
                },10000);
            });
    });

    it('should accept a settle for a Listing', function (done) {
        async.waterfall([
                function (callback) {
                    getParams(callback);
                },
                function (arg1, callback) {
                    let params;
                    params = JSON.parse(arg1);
                    let txn = {
                        "from": buyerAccount.addr,
                        "to": sellerAccount.addr,
                        "fee": params.fee,
                        "amount": 100,
                        "firstRound": params.lastRound,
                        "lastRound": params.lastRound + 100,//should be the same as the propose Settle
                        "note": util.convertToUint8Array(JSON.stringify({
                            "type": "Settle",
                            "prevTx": proposeSettleTxid
                        })),
                        "genesisID": params.genesisID,
                        "genesisHash": params.genesishashb64
                    };
                    //sign the transaction
                    var signedTxn = algo.signTransaction(txn, buyerAccount.sk);
                    let toSend = JSON.stringify({algoTx: Buffer.from(signedTxn.blob)});
                    let options = {
                        hostname: 'localhost',
                        port: 443,
                        path: '/settleREC',
                        method: 'POST',
                        key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
                        cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
                        ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
                        headers: {
                            'Content-Type': 'application/text',
                            'Content-Length' : toSend.length
                        }
                    };
                    var req = https.request(options, function(res) {
                        expect(res.statusCode).toBe(200);
                        var dataTmp = "";
                        res.on('data', function(data) {
                            dataTmp += data.toString();
                        });
                        res.on('end', function() {
                            callback(null,dataTmp);
                        });

                    });
                    req.on('error', function (err) {
                        console.log(err);
                    });
                    req.write(toSend);
                    req.end();
                }
            ],
            function (err,result) {
                done();
            });
    });


    it('should correctly accept a REC(second) ' +
        'if it has correctly signed registration tx, and REC signature', function (done) {
        let REC = {
            "type" : "REC",
            "powerProdWh" : Math.floor(Math.random() * Math.floor(100)),
            "owner" : ownerSM,
            "prevTx" : metadataTxid
        };
        //Sign Message how it is singed on Azure Sphere
        let RECCopy = JSON.stringify(REC).replace("{","").replace("}","");
        let hashREC = crypto.createHash('sha256').update(RECCopy).digest();
        let signature = ec.sign(hashREC, ecdh.getPrivateKey(), {canonical: true} );
        REC.sigDevice = Buffer.from(signature.toDER('hex'), 'hex').toString('base64');

        sentREC = REC;
        //Send a registration post request with X.509 certificate
        var options = {
            hostname: 'localhost',
            port: 443,
            path: '/newREC',
            method: 'POST',
            key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
            cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
            ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
            headers: {
                'Content-Type': 'application/json',
                'Content-Length' : JSON.stringify(REC).length
            }
        };

        var req = https.request(options, function(res) {
            expect(res.statusCode).toBe(200);
            var dataLoc = "";
            res.on('data', function(data) {
                dataLoc += data.toString();
            });
            res.on('end', function() {
                setTimeout(function () {
                    done();
                },10000);
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });

        req.write(JSON.stringify(REC));
        req.end();

    });


    it('should correctly return the second REC owned by the user', function (done) {
        //Send a registration post request with X.509 certificate
        var options = {
            hostname: 'localhost',
            port: 443,
            path: '/showAvailableRECs?owner=' + ownerSM,
            method: 'GET',
            key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
            cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
            ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem')
        };

        var req = https.request(options, function(res) {
            expect(res.statusCode).toBe(200);
            var dataLoc = "";
            res.on('data', function(data) {
                dataLoc += data.toString();
            });
            res.on('end', function() {
                let response = JSON.parse(dataLoc);
                RECTxid = response[0].tx.tx;
                sentREC = JSON.parse(JSON.stringify(sentREC));//To convert the signature in the correct form
                let RECs = [];
                response.forEach( REC => {RECs.push(JSON.parse(Buffer.from(REC.tx.note).toString()))});
                expect(RECs).toContain(sentREC);
                done();
            });
        });

        req.on('error', function (err) {
            console.log(err);
        });

        req.end();

    });


    it('should accept a retirement of a valid REC', function (done) {
        async.waterfall([
                function (callback) {
                    getParams(callback);
                },
                function (arg1, callback) {
                    let params;
                    params = JSON.parse(arg1);
                    let txn = {
                        "from": sellerAccount.addr,
                        "to": energyCompanyAccount.addr,
                        "fee": params.fee,
                        "amount": 1,
                        "firstRound": params.lastRound,
                        "lastRound": params.lastRound + 100,
                        "note": util.convertToUint8Array(JSON.stringify({
                            "type": "Retire",
                            "prevTx" : RECTxid
                        })),
                        "genesisID": params.genesisID,
                        "genesisHash": params.genesishashb64
                    };
                    //sign the transaction
                    var signedTxn = algo.signTransaction(txn, sellerAccount.sk);
                    let toSend = JSON.stringify({algoTx: Buffer.from(signedTxn.blob)});
                    let options = {
                        hostname: 'localhost',
                        port: 443,
                        path: '/retireREC',
                        method: 'POST',
                        key: fs.readFileSync(__dirname + '/certificates/client-key.pem'),
                        cert: fs.readFileSync(__dirname + '/certificates/client-crt.pem'),
                        ca: fs.readFileSync(__dirname + '/certificates/ca-crt.pem'),
                        headers: {
                            'Content-Type': 'application/text',
                            'Content-Length' : toSend.length
                        }
                    };
                    var req = https.request(options, function(res) {
                        expect(res.statusCode).toBe(200);
                        var dataTmp = "";
                        res.on('data', function(data) {
                            dataTmp += data.toString();
                        });
                        res.on('end', function() {
                            callback(null,dataTmp);
                        });

                    });
                    req.on('error', function (err) {
                        console.log(err);
                    });
                    req.write(toSend);
                    req.end();
                }
            ],
            function (err,result) {
                done();
            });
    });
});
