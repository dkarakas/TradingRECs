const cryptoHelpers = require('../../helpers/cryptoHelpers');
const CONSTANTS = require('../constants');


const Ajv = require('ajv');
const ajv = Ajv();
const JSONSchemas = require('../../schemasValidation/JSONSchemas');
const helper = require('../../helpers/utils');

//TODO:TEST
//TODO: Add creation of coins with each reading

// smartMeter: the smartMeter address associated with the asset
// meterreading: the amount of energy to be logged (counter)
// Timestamp:
// signature:
var newCoin = async function(ctx, reading){
    console.info('============= Begin : New reading ===========');

    var readingObject = JSON.parse(reading);
    let valid = ajv.validate(JSONSchemas.schemaReading, readingObject);

    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }

    valid = ajv.validate(JSONSchemas.schemaReadingMessage, JSON.parse(readingObject.message));
    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }
    console.info(reading);

    var pkVaultAsBytes = await ctx.stub.getState('AzurePublicKey');
    if (!pkVaultAsBytes || pkVaultAsBytes.length === 0) {
        throw new Error(`AzurePublicKey does not exist`);
    }

    if(cryptoHelpers.checkSignature(pkVaultAsBytes.toString(), reading)){
        const prodSMAsBytes = await ctx.stub.getState(JSON.parse(readingObject.message).smartMeter);
        if (!prodSMAsBytes || prodSMAsBytes.length === 0) {
            throw new Error(`${JSON.parse(readingObject.message).smartMeter} does not exists!`);
        }
        var prodObj = JSON.parse(prodSMAsBytes.toString());
        console.info("Reading will be under: \n");
        console.info(prodObj);
        let Coin = {
            coinId: `${prodObj.smartMeter}` + `_R` + prodObj.lastSmartMeterRead,
            state: CONSTANTS.COINS.ACTIVE,
            owner: JSON.parse(readingObject.message).smartMeter,
            reading: readingObject
        };
        let promiseProducingObj =  await ctx.stub.putState(`${prodObj.smartMeter}` + `_R` + `${prodObj.lastSmartMeterRead}`, Buffer.from(JSON.stringify(Coin)));
        prodObj.lastSmartMeterRead = (parseInt(prodObj.lastSmartMeterRead) + 1).toString();
        let promiseUpdateTotalSmartMeters = await ctx.stub.putState(prodObj.smartMeter, Buffer.from(JSON.stringify(prodObj)));
        Promise.all([promiseProducingObj, promiseUpdateTotalSmartMeters]);
    }else{
        throw new Error(`Wrong signature for the submitted reading`);
    }
    console.info('============= End : New reading ===========');
};

var allCoinsForProdSM = async function(ctx, smartMeter){
    let smartMeterAsBytes = await ctx.stub.getState(smartMeter);
    if (!smartMeterAsBytes || smartMeterAsBytes.length === 0) {
        throw new Error(`${smartMeterAsBytes} does not exist`);
    }
    const objSmartMeter = JSON.parse(smartMeterAsBytes.toString());
    return await helper.getAllEntries(ctx, `${objSmartMeter.smartMeter}_R`, 0, parseInt(objSmartMeter.lastSmartMeterRead));
};

var coinOfProdSM = async function(ctx, smartmeter, reading){
    let readingAsBytes = await ctx.stub.getState(`${smartmeter}_R${reading}`);
    if (!readingAsBytes || readingAsBytes.length === 0) {
        throw new Error(`${smartmeter}_R${reading} does not exist`);
    }
    return readingAsBytes.toString();
};

var cancelCoin = async function(ctx, coin) {
    console.info('============= Begin : Cancel Coin ===========');
    let coinAsBytes = await ctx.stub.getState(JSON.parse(coin).coin);
    if (!coinAsBytes || coinAsBytes.length === 0) {
        throw new Error(`Coin requested to be cancelled does not exist`);
    }

    let coinObj = JSON.parse(coinAsBytes);
    coinObj.state = CONSTANTS.COINS.CANCELLED;
    await ctx.stub.putState(coinObj.coinId, Buffer.from(JSON.stringify(coinObj)));
    console.info('============= End : Cancel Coin ===========');
};

var fetchCoinsByUser = async function(ctx, user){
    console.info('============= Begin : Fetch Coins By Users ===========');
    let userPassed = JSON.parse(user);
    let userAsBytes = await ctx.stub.getState(userPassed.userId);
    if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User does not exist!`);
    }
    let userObj = JSON.parse(userAsBytes.toString());

    let promiseProducingUnits = [];
    for(let i = 0; i < userObj.producingUnits.length; i++){
        // let promiseProducingUnit = await ;
        promiseProducingUnits.push(ctx.stub.getState(userObj.producingUnits[i]));
    }
    await Promise.all(promiseProducingUnits);

    let producingUnits = [];
    for(let i = 0; i < promiseProducingUnits.length; i++){
        if(!promiseProducingUnits[i] || promiseProducingUnits[i].length == 0){
            throw new Error(`Listing could not be fetched!`);
        }
        await promiseProducingUnits[i].then( function (producingUnit) {
            let producingUnitObj = JSON.parse(producingUnit.toString());
            producingUnits.push(producingUnitObj);
        });
    }

    //Format the coins in the expected way.
    let coins = [];
    for(let i = 0; i < producingUnits.length; i++){
        console.info(producingUnits[i]);
        let coinsForProdSM = await allCoinsForProdSM(ctx, producingUnits[i].smartMeter);
        console.info(coinsForProdSM);
        for(let j = 0; j < coinsForProdSM.length; j++){
            //The best way I found to copy an object.
            let coin = JSON.parse(JSON.stringify(producingUnits[i]));
            coin.owner = coin.user;
            coin.coinId = JSON.parse(coinsForProdSM[j]).coinId;
            coin.state = JSON.parse(coinsForProdSM[j]).state;
            coins.push(coin);
        }
    }
    console.info('============= End : Fetch Coins By Users ===========');
    return coins;
};


var fetchListedCoins = async function(ctx, users){
    console.info('============= Begin : Fetch Listed Coins ===========');
    let user = await users.allUsers(ctx);
    let arrUsers = user;
    let coinListed = [];
    for(let i = 0; i < arrUsers.length; i++){
        let coinsForAUser = await fetchCoinsByUser(ctx, arrUsers[i]);
        for(let i = 0; i < coinsForAUser.length; i++){
            if(coinsForAUser[i].state === CONSTANTS.COINS.LISTED){
                coinListed.push(coinsForAUser[i]);
            }
        }
    }
    console.info('============= End : Fetch Listed Coins ===========');
    return coinListed;
};

module.exports = { newCoin : newCoin,
    allCoinsForProdSM : allCoinsForProdSM,
    coinOfProdSM : coinOfProdSM,
    cancelCoin : cancelCoin,
    fetchCoinsByUser : fetchCoinsByUser,
    fetchListedCoins : fetchListedCoins };

