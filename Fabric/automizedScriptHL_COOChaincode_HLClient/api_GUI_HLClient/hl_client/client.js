'use strict';
/*eslint no-undef: 0*/

const enrollAdmin = require('./enrollAdmin');
const registerUser = require('./registerUser');
//USE INVOKE and QUERY FOR TESTING
const invokeChaincode = require('./invoke');
const fs = require('fs');

//Receiving MQTT Messages
//Set to the correct connection string
const connectionString = 'HostName=SiriusIoTHub.azure-devices.net;DeviceId=HLClient;SharedAccessKey=3ULDjTwjm8hLahLpJIfYJ4vBtRxnFpVOj3CG/WYG1fk=';
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const DeviceClient = require('azure-iot-device').Client;
const clientMqtt = DeviceClient.fromConnectionString(connectionString, Mqtt);

let promiseToDeleteFolder = function(path) {
    return new Promise((resolve, reject) => {
        let deleteFolderRecursive = function (path) {
            if (fs.existsSync(path)) {
                fs.readdirSync(path).forEach(function (file, index) {
                    console.log(path + '/' + file);
                    let curPath = path + '/' + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
            }
            fs.rmdirSync(path);
        };
        deleteFolderRecursive(path);
        resolve('Finished deleting');
    });
};


let register = async function(toRegister){
    if(toRegister) {
        console.log('Detected previous admin or user!');
        console.log('Deleting the following files:');
        if (fs.existsSync('./wallet'))
            await promiseToDeleteFolder('./wallet');
        fs.mkdirSync('./wallet');
        console.log('Registering new admin and user!');
        await enrollAdmin();
        await registerUser();
        const prodUnit = {
            smartMeter: 'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc',
            owner: 'Rim Karakashev',
            operationalSince: 'UNIX-timestamp when the asset entered service',
            capacityWh: 'capacity of the asset',
            lastSmartMeterReadWh: 'last meterreading in Wh',
            active: 'flag if the asset is enabled',
            lastSmartMeterRead: '0',
            country: 'Canada',
            region: 'Ontario',
            zip: 'N2L 3G1',
            city: 'Waterloo',
            street: '201 University Str',
            houseNumber: 'None',
            gpsLatitude: 'None',
            gpsLongitude: 'None',
            assetType: 'Solar',
            certificatesCreatedForWh: '1000',
            lastSmartMeterCO2OffsetRead: 'none',
            cO2UsedForCertificate: 'none',
            complianceRegistry: 'none',
            otherGreenAttributes: 'none',
            typeOfPublicSupport: 'government funding',
            maxOwnerChanges: 'none'
        };
        // invokeChaincode.invoke(('createUser',JSON.stringify(prodUnit));
    }

    //Registering to listen for new readings
    clientMqtt.on('message', function (msg) {
        console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
        //Printing signature
        //console.log(Buffer.from(JSON.parse(msg.data).signature).toString('hex'));
        clientMqtt.complete(msg, function printResult(err, res) {
            if (err) {
                console.log('Completed error: ' + err.toString());
            }
            if (res) {
                console.log('Completed status: ' + res.constructor.name);
            }
        });
        invokeChaincode.invoke('newCoin',JSON.stringify(JSON.parse(msg.data)));
    });
};



exports.register = register;

// // main(process.argv);
const prodUnit = {
    smartMeter: 'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc',
    owner: 'Dimcho Karakashev',
    operationalSince: 'UNIX-timestamp when the asset entered service',
    capacityWh: 'capacity of the asset',
    lastSmartMeterReadWh: 'last meterreading in Wh',
    active: 'flag if the asset is enabled',
    lastSmartMeterRead: '0',
    country: 'Canada',
    region: 'Ontario',
    zip: 'N2L 3G1',
    city: 'Waterloo',
    street: '201 University Str',
    houseNumber: 'None',
    gpsLatitude: 'None',
    gpsLongitude: 'None',
    assetType: 'Solar',
    certificatesCreatedForWh: '1000',
    lastSmartMeterCO2OffsetRead: 'none',
    cO2UsedForCertificate: 'none',
    complianceRegistry: 'none',
    otherGreenAttributes: 'none',
    typeOfPublicSupport: 'government funding',
    maxOwnerChanges: 'none'
};
invokeChaincode.invoke('createUser',JSON.stringify(prodUnit));

// const coinListing = {
//     coin: "c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc_R1",
//     listingId: "rAMrZ",
//     minPrice: 12
// }
// invokeChaincode.invoke('createCoinListing',JSON.stringify(coinListing));

// const bid = {
//     bidId : "AhIzf",
//     bidPrice : 15 ,
//     listing : "dAMrZ",
//     user: "User1"
// }
// invokeChaincode('createBid',JSON.stringify(bid));

// const cancelCoin = {
//     coin: "c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc_R1"
// }
// invokeChaincode('cancelCoin',JSON.stringify(cancelCoin));

// const listing = {
//     listing: "dAMrZ"
// }
// invokeChaincode('endListing', JSON.stringify(listing));

