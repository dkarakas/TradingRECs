let crypto = require('crypto');
let fs = require('fs');
var generateKeys = function () {
    const cryptoServer = crypto.createECDH('secp256k1');
    const pubKey = cryptoServer.generateKeys('base64');
    const privateKey = cryptoServer.getPrivateKey('base64');
    fs.writeFile('./pubkey', pubKey, (err) => {
        console.log(err);
    });
    fs.writeFile('./prvKey', privateKey, (err) => {
        console.log(err);
    });

};

exports.generateKeys = generateKeys;