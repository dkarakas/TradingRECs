'use strict';

const { Contract } = require('fabric-contract-api');

const users = require('./components/users/users');
const producingUnits = require('./components/producingUnits/producingUnits');
const pubKeyApiHelpers = require('./helpers/pubKeyApiHelpers');
const readings = require('./components/readings/reading');
const coinListings = require('./components/CoinListings/coinlisting');
const bids = require('./components/bids/bid');

class COOChaincode extends Contract {

    //TODO: Fix promises
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        await this.updatePK(ctx);
        // const prodUnit = {
        //     smartMeter: 'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc',
        //     owner: 'Dimcho Karakashev',
        //     operationalSince: 'UNIX-timestamp when the asset entered service',
        //     capacityWh: 'capacity of the asset',
        //     lastSmartMeterReadWh: 'last meterreading in Wh',
        //     active: 'flag if the asset is enabled',
        //     lastSmartMeterRead: '0',
        //     country: 'Canada',
        //     region: 'Ontario',
        //     zip: 'N2L 3G1',
        //     city: 'Waterloo',fabric-contract-api vs fabric-shim
        //     street: '201 University Str',
        //     houseNumber: 'None',
        //     gpsLatitude: 'None',
        //     gpsLongitude: 'None',
        //     assetType: 'Solar',
        //     certificatesCreatedForWh: '1000',
        //     lastSmartMeterCO2OffsetRead: 'none',
        //     cO2UsedForCertificate: 'none',
        //     complianceRegistry: 'none',
        //     otherGreenAttributes: 'none',
        //     typeOfPublicSupport: 'government funding',
        //     maxOwnerChanges: 'none'
        // };
        // console.info('Creating the following SM:');
        // console.info(JSON.stringify(prodUnit));
        // await ctx.stub.putState(prodUnit.smartMeter, Buffer.from(JSON.stringify(prodUnit)));
        //
        // const numProdUnits =  1;
        // await ctx.stub.putState('SM', Buffer.from(numProdUnits.toString()));
        // const deviceID = 'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc';
        // await ctx.stub.putState('SM0', Buffer.from(deviceID));
        // let numProdUnits = 0;
        // await ctx.stub.putState('SM', Buffer.from(numProdUnits.toString()));

        let numUsers = 0;
        await ctx.stub.putState('User', Buffer.from(numUsers.toString()));
        console.info('============= END : Initialize Ledger ===========');
    }

    // Creates user and producing unit
    // const user = {
    //     smartMeter: 'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc',
    //     owner: 'Dimcho Karakashev',
    //     operationalSince: 'UNIX-timestamp when the asset entered service',
    //     capacityWh: 'capacity of the asset',
    //     lastSmartMeterReadWh: 'last meterreading in Wh',
    //     active: 'flag if the asset is enabled',
    //     lastSmartMeterRead: '0',
    //     country: 'Canada',
    //     region: 'Ontario',
    //     zip: 'N2L 3G1',
    //     city: 'Waterloo',
    //     street: '201 University Str',
    //     houseNumber: 'None',
    //     gpsLatitude: 'None',
    //     gpsLongitude: 'None',
    //     assetType: 'Solar',
    //     certificatesCreatedForWh: '1000',
    //     lastSmartMeterCO2OffsetRead: 'none',
    //     cO2UsedForCertificate: 'none',
    //     complianceRegistry: 'none',
    //     otherGreenAttributes: 'none',
    //     typeOfPublicSupport: 'government funding',
    //     maxOwnerChanges: 'none'
    // };
    async createUser(ctx, user){
        await users.createUser(ctx, user, producingUnits);
    }

    async allUsers(ctx){
        return users.allUsers(ctx);
    }



    async newCoin(ctx, reading){
        await readings.newCoin(ctx, reading);
    }

    // {
    //     coin: "sdasdas_R5"
    // }
    async cancelCoin(ctx, coin){
        await readings.cancelCoin(ctx, coin);
    }

    async allCoinsForProdSM(ctx, smartmeter){
        return await readings.allCoinsForProdSM(ctx, smartmeter);
    }

    async coinOfProdSM(ctx, smartmeter, reading){
        return await readings.coinOfProdSM(ctx, smartmeter, reading);
    }

    // {
    //     coin: "sdasdas_R5",
    //     listingId: "yAMrZ",
    //     minPrice: 12
    // }
    async createCoinListing(ctx, listing){
        await coinListings.createListing(ctx, listing);
    }

    /*
        {
            listing: "yAMrZ"
        }
    */
    async endListing(ctx, listing){
        await coinListings.endListing(ctx, listing);
    }

    // {
    //     bidId: "AhIzR",
    //     bidPrice: 16,
    //     listing: "ryAMrZ",
    //     user: "User2"
    // }
    async createBid(ctx, bid){
        await bids.createBid(ctx, bid);
    }

    async fetchActiveListings(ctx){
        return await coinListings.fetchActiveListings(ctx);
    }

    //{
    //  userId: 'User0'
    //  user: 'resource:org.rec.User#User0'
    //}
    async fetchListingsByUser(ctx, user){
        return await coinListings.fetchListingsByUser(ctx, user);
    }

    async fetchListedCoins(ctx){
        return await readings.fetchListedCoins(ctx, users);
    }

    //{
    //  userId: 'User0',
    // user: 'resource:org.rec.User#User0'
    //}
    async fetchCoinsByUser(ctx, user){
        return await readings.fetchCoinsByUser(ctx,user);
    }

    //{
    // userId: 'user-alice'
    // user: 'resource:org.rec.User#user-alice'
    //}
    async fetchListingsByUser(ctx, user){
        return await coinListings.fetchListingsByUser(ctx, user);
    }

    //{
    // userId: 'user-alice'
    // user: 'resource:org.rec.User#user-alice'
    //}
    async fetchBidsByUser(ctx, user){
        return await bids.fetchBidsByUser(ctx, user);
    }

    async updatePK(ctx){
        console.info('============= Begin : Azure Pub Key to be updated ===========');
        let pubKey = await pubKeyApiHelpers.getURL();
        console.info("The response was the following:");
        console.info(pubKey);
        await ctx.stub.putState('AzurePublicKey', Buffer.from(JSON.stringify(JSON.parse(pubKey).formattedCryptoSuit)));
        console.info('============= END : Azure Pub Key was updated ===========');
    }
}

module.exports = COOChaincode;

