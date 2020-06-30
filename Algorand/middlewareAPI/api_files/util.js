const fs = require('fs');
const pem = require('pem');

let readFile = function (filename) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filename, function (err, data) {
            if(err){
                reject(err);
            }else {
                resolve(data.toString().trim());
            }
        });
    })
};

/**
 * @param {string} value
 */
let convertToUint8Array = function(value){
    var text = Buffer.from(value);
    var retArray = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) retArray[i] = text[i];
    return retArray;
};


/**
 * Converts X.509 Certificate from ram to PEM
 * @param {buffer} cert
 * @return {string} Pem version of the certificate
 */
let rawToPem = function (cert) {
    var prefix = '-----BEGIN CERTIFICATE-----\n';
    var postfix = '-----END CERTIFICATE-----';
    var pemText = prefix +
        cert.toString('base64').match(/.{0,64}/g).join('\n') + postfix;
    return pemText;
};

/**
 * Converts X.509 Certificate from ram to PEM
 * @param {buffer} pem version
 * @param {array} pem array of CA ceritifcates\
 * @return {Promise}
 */
let verifySigningChain = function(clientCert, listRootCAs){
    return new Promise((resolve, reject) =>{
        pem.verifySigningChain(clientCert, listRootCAs, function (err, data) {
            if (err) {
                reject(new Error(err));
            } else {
                if (!data) {
                    reject("Cannot verify the X509 certificate!");
                }else{
                    resolve();
                }
            }
        });
    })
};

module.exports = {readFile : readFile,
    convertToUint8Array : convertToUint8Array,
    rawToPem : rawToPem,
    verifySigningChain : verifySigningChain};