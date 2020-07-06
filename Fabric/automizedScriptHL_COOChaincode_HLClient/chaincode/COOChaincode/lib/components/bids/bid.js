const Ajv = require('ajv');
const ajv = Ajv();
const JSONSchemas = require('../../schemasValidation/JSONSchemas');
const CONSTANTS = require('../constants');
/* Convention:
Key - Bid stores the number of Bids in the market
Key - Bid0 stores the first coin
Key - Bid1 stores the second coin
*/
var createBid = async function(ctx, bid){
    console.info('============= BEGIN : Creating Bid ===========');
    let bidObj = JSON.parse(bid);
    let valid = ajv.validate(JSONSchemas.schemaBid, bidObj);

    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }

    let userAsBytes =await ctx.stub.getState(bidObj.user);
    if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User does not exist!`);
    }
    let userObj = JSON.parse(userAsBytes.toString());

    let listingAsBytes =await ctx.stub.getState(bidObj.listing);
    if (!listingAsBytes || listingAsBytes.length === 0) {
        throw new Error(`Listing does not exist!`);
    }

    //TODO: update balances
    let listingObj = JSON.parse(listingAsBytes.toString());
    listingObj.bidPrices.push({ bidId : bidObj.bidId, bidPrice : bidObj.bidPrice});
    userObj.bids.push(bidObj.bidId);
    userObj.balance -= bidObj.bidPrice;
    if (userObj.balance < 0) {
        throw new Error(`user does not have enough money!`);
    }
    bidObj.state = CONSTANTS.BIDS.SUBMITTED;
    //write user listing and bid
    let promiseListingObj = await ctx.stub.putState(listingObj.listingId, Buffer.from(JSON.stringify(listingObj)));
    let promiseUserObj = await ctx.stub.putState(userObj.userId, Buffer.from(JSON.stringify(userObj)));
    let promiseBidObj = await ctx.stub.putState(bidObj.bidId, Buffer.from(JSON.stringify(bidObj)));
    Promise.all([promiseListingObj, promiseUserObj, promiseBidObj]);
    console.info('============= END : Creating Bid ===========');
};


var allBids = async function(ctx){
    console.info('============= Begin : All Bids ===========');

    var numBidsAsBytes = await ctx.stub.getState('Bid');
    if (!numBidsAsBytes || numBidsAsBytes.length === 0) {
        throw new Error(`SM key does not exist!`);
    }
    var numBid = numBidsAsBytes.toString();
    console.info(numBid);
    const allBids = [];
    const iterator = await ctx.stub.getStateByRange(`User0`, `User${numBid}`);
    //Can we do this in parallel?
    while (true) {
        const res = await iterator.next();

        if (res.value && res.value.value.toString()) {
            let Record = res.value.value.toString('utf8');
            allBids.push(Record);
        }
        if (res.done) {
            await iterator.close();
            console.info(allBids);
            console.info('============= End : All Bids ===========');
            return JSON.stringify(allBids);
        }
    }
};

var fetchBidsByUser = async function(ctx, user){
    console.info('============= BEGIN : Bids By User ===========');
    console.info(user);
    let userPassed = JSON.parse(user);
    let userAsBytes = await ctx.stub.getState(userPassed.userId);
    if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User key does not exist!`);
    }
    let userObj = JSON.parse(userAsBytes.toString());

    let promiseForBids = [];
    for(let i = 0; i < userObj.bids.length; i++){
        let promiseBid = await ctx.stub.getState(userObj.bids[i]);
        promiseForBids.push(promiseBid);
    }
    //TODO: Fix promises
    Promise.all(promiseForBids);

    let bidsForUser = [];

    for(let i = 0; i < promiseForBids.length; i++){
        if(!promiseForBids[i] || promiseForBids[i].length == 0){
            throw new Error(`Listing could not be fetched!`);
        }
        let bidObject = JSON.parse(promiseForBids[i].toString());
        console.info(bidObject);
        bidsForUser.push(bidObject);
    };

    console.info('============= END : Bids By User ===========');
    return bidsForUser;
};

module.exports = {createBid : createBid, allBids: allBids, fetchBidsByUser : fetchBidsByUser};