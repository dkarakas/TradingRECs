const cryptoSuit = require('../../impl/CryptoSuite_ECDSA_AES.js');
//messageAsString should be a string containing parameters message(string) and string(Buffer)
var checkSignature = function(pkVault, messageAsString){
    //verify signature using cryptosuit!!!!
    var cryptForPk = new cryptoSuit(256, "sha2");

    var messageObj = JSON.parse(messageAsString);

    //NOTE: pkVaultAsBytes should be uncompressed version formatting!!!!
    //      expected to by stored on the Blockchain in the correct format.
    // var PK = cryptForPk.importAzureKey("04" + "aeab07d0f1424fcbf435b458915daa816f69d69462d4a4b770b98b9839053c300a183e91da19daa4fe23eb78e2bdbffbe10ec39f5136fe313a9dbbe0bdb3462b");
    var PK = cryptForPk.importAzureKey(pkVault);
    if(cryptForPk.verify(PK, transforIntoDerEncoding(Buffer.from(messageObj.signature)).toString('hex'), messageObj.message)){
        console.info("Signature is correct!");
        return true;
    }else{
        console.info("Signature is wrong");
        return false;
    }
}

var transforIntoDerEncoding = function(signature){
    var indInSig = 0;
    var newBuff = Buffer.alloc(70);
    newBuff[0] = 0x30; // start encoding
    newBuff[1] = 0x44; // the length of all subsequent bits
    newBuff[2] = 0x02; // standard to start R
    newBuff[3] = 0x20; // length of r
    for ( var i = 4; i < 4 + 32; i++, indInSig++){
        newBuff[i] = signature[indInSig];
    }
    newBuff[36] = 0x02; // standard to start S
    newBuff[37] = 0x20; // length of s
    for ( var i = 38; i < 38 + 32; i++, indInSig++){
        newBuff[i] = signature[indInSig];
    }
    return newBuff;
}

module.exports = {checkSignature : checkSignature};