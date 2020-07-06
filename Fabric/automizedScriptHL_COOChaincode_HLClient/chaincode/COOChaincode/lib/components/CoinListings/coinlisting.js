const Ajv = require('ajv');
const ajv = Ajv();
const JSONSchemas = require('../../schemasValidation/JSONSchemas');
const CONSTANTS = require('../constants');
const users = require('../users/users');
/* Convention:
Key - Listing stores the number of Coins in the market
Key - Listing0 stores the first coin
Key - Listing1 stores the second coin
*/
//TODO: TEST without await
let createListing = async function(ctx, listing){
    console.info('============= BEGIN : Creating Coin Listing ===========');
    let listingObj = JSON.parse(listing);
    let valid = ajv.validate(JSONSchemas.schemaCoinListing, listingObj);

    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }

    listingObj.listingState = CONSTANTS.LISTINGSTATE.ACTIVE;
    listingObj.bidPrices = [];

    let coinAsBytes = await ctx.stub.getState(listingObj.coin);
    if (!coinAsBytes || coinAsBytes.length === 0) {
        throw new Error(`Coin for listing does not exist!`);
    }
    let coinObj = JSON.parse(coinAsBytes.toString());
    if(coinObj.state === CONSTANTS.COINS.LISTED){
        throw new Error(`Coin is already listed!`);
    }

    let prodUnitAsBytes = await ctx.stub.getState(JSON.parse(coinObj.reading.message).smartMeter);
    if (!prodUnitAsBytes || prodUnitAsBytes.length === 0) {
        throw new Error(`Producing Unit for the coin does not exist!`);
    }
    let prodUnitObj = JSON.parse(prodUnitAsBytes.toString());

    let userAsBytes = await ctx.stub.getState(prodUnitObj.user);
    if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User does not exist!`);
    }

    //TODO: Check all users not only the current one?
    let userObj = JSON.parse(userAsBytes.toString());
    userObj.coinListings.forEach( listingId => {
        if(listingId === listingObj.listingId){
            throw new Error('Listing with this id already exists');
        }
    });


    userObj.coinListings.push(listingObj.listingId);
    coinObj.state = CONSTANTS.COINS.LISTED;
    listingObj.user = userObj.userId;
    console.info('Updating user with:');
    console.info(userObj);
    console.info('Listing');
    console.info(listingObj);
    console.info('Coin Object');
    console.info(coinObj);
    //Cannot use Promise.all for some reason:PUT_STATE failed:  no ledger context promise
    await ctx.stub.putState(coinObj.coinId, Buffer.from(JSON.stringify(coinObj)));
    await ctx.stub.putState(userObj.userId, Buffer.from(JSON.stringify(userObj)));
    await ctx.stub.putState(listingObj.listingId, Buffer.from(JSON.stringify(listingObj)));
    console.info('============= END : Creating Coin Listing ===========');
};

let endListing = async function(ctx, listing){
    console.info('============= BEGIN : End Coin Listing ===========');
    listing = await ctx.stub.getState(JSON.parse(listing).listing);
    if(!listing || listing.length === 0){
        throw new Error(`Listing could not be fetched!`);
    }

    let listingObj = JSON.parse(listing.toString());
    console.info(listingObj);

    if(listingObj.bidPrices.length === 0){
        throw new Error('There are no bids for this listing');
    }

    let succBid = { bidId : undefined, bidPrice : 0};
    listingObj.bidPrices.forEach( bid => {
        if(bid.bidPrice > succBid.bidPrice){
            succBid = bid;
        }
    });

    let bidsUnsuccessful = [];
    console.info(succBid);

    for(let i = 0; i < listingObj.bidPrices.length; i++){
        if(listingObj.bidPrices[i].bidId !== succBid.bidId){
            console.info(listingObj.bidPrices[i].bidId);
            let promiseBid = ctx.stub.getState(listingObj.bidPrices[i].bidId);
            bidsUnsuccessful.push(promiseBid);
        }
    }

    await Promise.all(bidsUnsuccessful);
    console.info("all unsuccessful bids were retrieved");
    console.log(bidsUnsuccessful);
    let promisesUpdateUnsuccBids = [];
    let promisesUpdateUserBalances = [];
    for(let i = 0; i < bidsUnsuccessful.length; i++){
        if(!bidsUnsuccessful[i] || bidsUnsuccessful[i].length == 0){
            throw new Error(`Bid could not be fetched!`);
        }
        console.info('To address bid: ' + i.toString());
        bidsUnsuccessful[i].then( async function (bidUnsuccessful){
            console.log('bidUnsuccessful:');
            console.log(bidUnsuccessful);
            let bidObj = JSON.parse(bidUnsuccessful.toString());
            bidObj.state = CONSTANTS.BIDS.UNSUCCESSFUL;
            console.log('End Listing: bidObj is ');
            console.log(bidObj);
            let user = await ctx.stub.getState(bidObj.user);
            let userObj = JSON.parse(user.toString());
            //TODO: Balances are not returned for some reason
            userObj.balance += bidObj.bidPrice;
            promisesUpdateUserBalances.push(ctx.stub.putState(userObj.userId, Buffer.from(JSON.stringify(userObj))));
            promisesUpdateUnsuccBids.push(ctx.stub.putState(bidObj.bidId, Buffer.from(JSON.stringify(bidObj))));
        });
    }
    await Promise.all(promisesUpdateUnsuccBids);
    await Promise.all(promisesUpdateUserBalances);

    let bid = await ctx.stub.getState(succBid.bidId);
    if(!bid || bid.length == 0){
        throw new Error(`Successful bid could not be fetched!`);
    }
    let bidObj = JSON.parse(bid.toString());

    console.info(bidObj.user);
    let succBidUser = await ctx.stub.getState(bidObj.user);

    if(!succBidUser || succBidUser.length == 0){
        throw new Error(`Successful bid user could not be fetched!`);
    }

    let succBidUserObj = JSON.parse(succBidUser.toString());

    console.info(listingObj.coin);
    let coinToBeTransferred = await ctx.stub.getState(listingObj.coin);
    if(!coinToBeTransferred || coinToBeTransferred.length == 0){
        throw new Error(`Coin could not be fetched!`);
    }
    let coinToBeTransferredObj = JSON.parse(coinToBeTransferred.toString());
    console.info(coinToBeTransferredObj);

    console.info(JSON.parse(coinToBeTransferredObj.reading.message).smartMeter);
    let prodUnit = await ctx.stub.getState(JSON.parse(coinToBeTransferredObj.reading.message).smartMeter);
    if(!prodUnit || prodUnit.length == 0){
        throw new Error(`Coin could not be fetched!`);
    }

    let originalOwnerCoin = await ctx.stub.getState(JSON.parse(prodUnit.toString()).user);
    if(!originalOwnerCoin || originalOwnerCoin.length == 0){
        throw new Error(`Coin could not be fetched!`);
    }
    console.info(originalOwnerCoin.toString());

    let originalOwnerCoinObj = JSON.parse(originalOwnerCoin.toString());

    originalOwnerCoinObj.balance += succBid.bidPrice;

    bidObj.state = CONSTANTS.BIDS.SUCCESSFUL;
    coinToBeTransferredObj.state = CONSTANTS.COINS.BOUGHT;
    listingObj.listingState = CONSTANTS.LISTINGSTATE.ENDED;
    console.info('Listing To Save');
    console.info(listingObj);
    let promiseUpdateSuccBidUser = await ctx.stub.putState(succBidUserObj.userId, Buffer.from(JSON.stringify(succBidUserObj)));
    let promiseUpdateOriginalOwner = await ctx.stub.putState(originalOwnerCoinObj.userId, Buffer.from(JSON.stringify(originalOwnerCoinObj)));
    let promiseUpdateBid = await ctx.stub.putState(bidObj.bidId, Buffer.from(JSON.stringify(bidObj)));
    let promiseCoinToBeTransferred = await ctx.stub.putState(listingObj.coin, Buffer.from(JSON.stringify(coinToBeTransferredObj)));
    let promiseUpdateListing = await ctx.stub.putState(listingObj.listingId, Buffer.from(JSON.stringify(listingObj)));
    Promise.all([promiseUpdateSuccBidUser, promiseUpdateOriginalOwner, promiseUpdateBid, promiseCoinToBeTransferred, promiseUpdateListing]);

    let prodUnitNewOwner = await ctx.stub.getState(succBidUserObj.producingUnits[0]);
    if(!prodUnitNewOwner || prodUnitNewOwner.length == 0){
        throw new Error(`Coin could not be fetched!`);
    }
    prodUnitNewOwner = JSON.parse(prodUnitNewOwner.toString());
    console.info("Reading will be under: \n");
    console.info(prodUnitNewOwner);
    coinToBeTransferredObj.state = CONSTANTS.COINS.ACTIVE;
    coinToBeTransferredObj.owner = prodUnitNewOwner.smartMeter;
    coinToBeTransferredObj.coinId = `${prodUnitNewOwner.smartMeter}` + `_R` + `${prodUnitNewOwner.lastSmartMeterRead}`;
    console.info(coinToBeTransferredObj);
    let promiseUpdateCoin = await ctx.stub.putState(`${prodUnitNewOwner.smartMeter}` + `_R` + `${prodUnitNewOwner.lastSmartMeterRead}`, Buffer.from(JSON.stringify(coinToBeTransferredObj)));
    prodUnitNewOwner.lastSmartMeterRead = (parseInt(prodUnitNewOwner.lastSmartMeterRead) + 1).toString();
    let promiseUpdateProdUnitNewOwner = await ctx.stub.putState(prodUnitNewOwner.smartMeter, Buffer.from(JSON.stringify(prodUnitNewOwner)));
    Promise.all([promiseUpdateProdUnitNewOwner , promiseUpdateCoin]);

    console.info('============= END : End Coin Listing ===========');
};

var fetchActiveListings = async function(ctx) {
    console.info('============= BEGIN : Fetch Active Listing ===========');

    const userArr = await users.allUsers(ctx);
    var allListigns = [];
    for(var i = 0; i < userArr.length; i++){
        for(var j = 0; j < JSON.parse(userArr[i]).coinListings.length; j++){
            allListigns.push(ctx.stub.getState(JSON.parse(userArr[i]).coinListings[j]));
        }
    }
    await Promise.all(allListigns);

    console.log(allListigns);
    let activeListings = [];
    for(let i = 0; i < allListigns.length; i++){
        if(!allListigns[i] || allListigns[i].length == 0){
            throw new Error(`Listing could not be fetched!`);
        }
        await allListigns[i].then(listings =>{
            let listingObject = JSON.parse(listings.toString());
            if(listingObject.listingState === CONSTANTS.COINS.ACTIVE){
                activeListings.push(listingObject);
            }
        });
    }
    console.log(activeListings);
    console.info('============= END : Fetch Active Listing ===========');
    return activeListings;
};

var fetchListingsByUser = async function(ctx, user){
    console.info('============= BEGIN : Fetch Listings By User ===========');
    let userPassed = JSON.parse(user);
    let userAsBytes = await ctx.stub.getState(userPassed.userId);
    if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User key does not exist!`);
    }
    let userObj = JSON.parse(userAsBytes.toString());

    let promiseForListings = [];
    for(let i = 0; i < userObj.coinListings.length; i++){
        let promiseListing = ctx.stub.getState(userObj.coinListings[i]);
        promiseForListings.push(promiseListing);
    }
    Promise.all(promiseForListings);

    console.log(promiseForListings);
    let listingsForUser = [];
    for(let i = 0; i < promiseForListings.length; i++){
        if(!promiseForListings[i] || promiseForListings[i].length == 0){
            throw new Error(`Listing could not be fetched!`);
        }
        promiseForListings[i].then( listing => {
            let listingObject = JSON.parse(listing);
            console.info(listingObject);
            listingsForUser.push(listingObject);
        });
    };

    console.info('============= END : Fetch Listings By User ===========');
    return listingsForUser;
};

module.exports = {createListing : createListing, endListing : endListing, fetchActiveListings : fetchActiveListings, fetchListingsByUser: fetchListingsByUser};
