// const api = require('./api.js');
const cryptoSuit = require('./impl/CryptoSuite_ECDSA_AES.js');

var KeyVault = require('azure-keyvault');
const msRestAzure = require('ms-rest-azure');

//Send signatures in messages
var IoTHubClient = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
var connectionString = process.env["connectionStringToSubmitSignedTransactions"];
var deviceId = 'HLClient'; //set the id of the client for IoT Hub
var client = IoTHubClient.fromConnectionString(connectionString);
var signature;


function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

module.exports = async function (context, IoTHubMessages) {
    context.log(`JavaScript eventhub trigger function called for message array: ${IoTHubMessages}`);

    // getKey(context);

    //TODO: What happens with multiple messages from different sources?
    if(context.bindingData.hasOwnProperty('systemPropertiesArray')) {
        // context.log(context.bindingData.systemPropertiesArray[0]);
        var foo = 'iothub-connection-device-id'; //directly accessing causes problems(that is - is not valid)
        context.log(' Smart Meter sending message:' + context.bindingData.systemPropertiesArray[0][foo]);
    }else{
        context.log('Property systemPropertiesArray does not exist and cannot determine the authentication method of ' +
            'the message!');
        context.done();
        return;
    }
    // The ms-rest-azure library allows us to login with MSI by providing the resource name. In this case the resource is Key Vault.
    const credentials = await msRestAzure.loginWithAppServiceMSI({resource: 'https://vault.azure.net'});
    const keyVaultClient = new KeyVault.KeyVaultClient(credentials);

    var vaultUri = process.env["VaultUri"];

    // Getting signature on json file without accessing the secret key
    var crypt = new cryptoSuit(256, "sha2");

    await Promise.all(IoTHubMessages.map(async (IoTMessage) => {
        IoTMessage = JSON.parse(IoTMessage);
        var foo = 'iothub-connection-device-id';
        console.log(IoTMessage);
        IoTMessage.smartMeter = context.bindingData.systemPropertiesArray[0][foo];
        IoTMessage.timestamp = context.bindingData.systemPropertiesArray[0].EnqueuedTimeUtc;
        IoTMessage = JSON.stringify(IoTMessage);

        //verify signature using cryptosuit!!!!
        var cryptForPk = new cryptoSuit(256, "sha2");
        //TODO: Maybe get the pk vault only once and save it locally? Is it good idea?
        const pkVault = await keyVaultClient.getKey(vaultUri, process.env["KeyName"], "");
        //04 is needed to indicate that the public key is not compressed.
        var PK = cryptForPk.importAzureKey("04" + pkVault.key.x.toString('hex') + pkVault.key.y.toString('hex'));

        //Keep signing until we get a valid signature( a one with reasonable s)
        //What is wrong can be found here: https://github.com/bitcoin/bips/blob/master/bip-0062.mediawiki
        signature = await keyVaultClient.sign(vaultUri, process.env["KeyName"], "", "ES256", Buffer.from(crypt.hash(IoTMessage), 'hex'));
        while (!crypt.checkMalleability(_transforIntoDerEncoding(signature.result), PK._key.ecparams)) {
            context.log("Signature was false");
            signature = await keyVaultClient.sign(vaultUri, process.env["KeyName"], "", "ES256", Buffer.from(crypt.hash(IoTMessage), 'hex'));
        }

        context.log(cryptForPk.verify(PK, _transforIntoDerEncoding(signature.result), IoTMessage));

        var messageToSend = {
            message: IoTMessage,
            signature: signature.result
        };

        var err = await client.open();
        context.log("Connecting to send sign transaction status: ");
        context.log(err);
        if (err.message) {
            context.log('Could not connect: ' + err.message);
        } else {
            context.log('Service client connected');
            await client.getFeedbackReceiver(function (err, receiver) {
                receiver.on('message', function (msg) {
                    context.log('Feedback message:');
                    context.log(msg.getData().toString('utf-8'));
                })
            });

            var message = new Message(JSON.stringify(messageToSend));
            message.ack = 'full';
            message.messageId = "My Message ID";
            context.log('Sending message: ' + message.getData());
            await client.send(deviceId, message, printResultFor('send'));
        }
    }));
    context.done();
};

//For more info https://bitcoin.stackexchange.com/questions/58853/how-do-you-figure-out-the-r-and-s-out-of-a-signature-using-python?rq=1
function _transforIntoDerEncoding(singature){
    var indInSig = 0;
    var newBuff = Buffer.alloc(70)
    newBuff[0] = 0x30; // start encoding
    newBuff[1] = 0x44; // the length of all subsequent bits
    newBuff[2] = 0x02; // standard to start R
    newBuff[3] = 0x20; // length of r
    for ( var i = 4; i < 4 + 32; i++, indInSig++){
        newBuff[i] = singature[indInSig];
    }
    newBuff[36] = 0x02; // standard to start S
    newBuff[37] = 0x20; // length of s
    for ( var i = 38; i < 38 + 32; i++, indInSig++){
        newBuff[i] = singature[indInSig];
    }
    // newBuff[newBuff.length - 1] = 0x09; // hash type but idk if that is correct
    return newBuff;
}