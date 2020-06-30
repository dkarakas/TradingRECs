let crypto = require('crypto');
let fs = require('fs');
var generateKeys = function () {
    const cryptoServer = crypto.createECDH('secp256k1');
    const pubKey = cryptoServer.generateKeys('base64');
    fs.writeFile('keys/prvKey', cryptoServer.getPrivateKey('base64'), (err) => {
        if(err) {
            console.log(err);
        }else{
            console.log("Private key of utility provider generated and saved!")
        }
    });
    fs.writeFile('keys/pubKey', cryptoServer.getPublicKey('base64'), (err) => {
        if(err) {
            console.log(err);
        }else{
            console.log("Public key of utility provider generated and saved!")
        }
    });
};

generateKeys();
//exports.generateKeys = generateKeys;