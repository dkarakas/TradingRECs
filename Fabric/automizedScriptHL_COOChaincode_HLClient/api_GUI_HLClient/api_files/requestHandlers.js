let invokeHL = require('../hl_client/invoke');
let queryHL = require('../hl_client/query');

//TODO: deal with errors when a post request is unsuccessful.
let user = async function(response, postData, getData){
    console.log('All users:');
    let result = [];
    let users = JSON.parse(await queryHL.query('allUsers'));
    //Use username to log in
    let userToLogIn = getData.match('.?%22(userId|firstName)%22:%22(.*)%22.?')[2];
    users.forEach( user =>
    {
        let userObj = JSON.parse(user);
        if(userObj.userId === userToLogIn){
            userObj.user = 'resource:org.rec.Coin#' + JSON.parse(user).userId;
            result.push(userObj)
        }
    });
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    response.write(JSON.stringify(result));
    response.end();
};

let selectActiveListings = async function(response, postData, getData){
    let activeListings = JSON.parse(await queryHL.query('fetchActiveListings'));

    for(let i = 0; i < activeListings.length; i++){
        let bidPrices = [];
        console.log(activeListings[i].bidPrices);
        for(let j = 0; j < activeListings[i].bidPrices.length; j++){
            bidPrices.push(activeListings[i].bidPrices[j].bidPrice);
        }
        activeListings[i].bidPrices = bidPrices;
        activeListings[i].state = 'ACTIVE';
        activeListings[i].coin = 'resource:org.rec.Coin#' + activeListings[i].coin;
        activeListings[i].user = 'resource:org.rec.User#' + activeListings[i].user;
    }
    //Reformatting for the GUI.
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    console.log('selectActiveListings: API will respond with:');
    console.log(activeListings);
    response.write(JSON.stringify(activeListings));
    response.end();
};

let selectListedCoins = async function(response, postData, getData){
    // let queries = [];
    // queries.push(
    //     {let resultObj =
    //         $class: 'org.rec.Coin',
    //         active: true,
    //         assetType: 'WIND',
    //         cO2UsedForCertificate: 0,
    //         capacityWh: 10000,
    //         certificatesCreatedForWh: 0,
    //         city: 'Waterloo',
    //         coinId: '0000',
    //         complianceRegistry: 'none',
    //         country: 'Canada',
    //         gpsLatitude: '0',
    //         gpsLongitude: '0',
    //         houseNumber: '8',
    //         lastSmartMeterCO2OffsetRead: 0,
    //         lastSmartMeterReadFileHash: '',
    //         lastSmartMeterReadWh: 0,
    //         operationalSince: 1514764800,
    //         otherGreenAttributes: 'N.A.',
    //         owner: 'User0',
    //         region: 'Ontario',
    //         smartMeter: '0x343854a430653571b4de6bf2b8c475f828036c30',
    //         state: 'LISTED',
    //         street: 'Main Street',
    //         typeOfPublicSupport: 'N.A',
    //         zip: 'XXX XXX'response
    // });
    let listedCoins = JSON.parse(await queryHL.query('fetchListedCoins'));
    for(let i = 0; i < listedCoins.length; i++){
        listedCoins[i].user = 'resource:org.rec.User#' + listedCoins[i].user;
        listedCoins[i].owner = 'resource:org.rec.User#' + listedCoins[i].owner;
    }
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    console.log('selectListedCoins: API will respond with');
    console.log(JSON.stringify(listedCoins));
    response.write(JSON.stringify(listedCoins));
    response.end();
};


let selectCoinsByUser = async function(response, postData, getData){
    let userId = getData.match('.?resource:org.rec.User%23(.*)')[1];
    // console.log(userId);
    let user = {
        userId : userId,
        user : 'resource:org.rec.User#' + userId
    };
    let coinsForUser = JSON.parse(await queryHL.query('fetchCoinsByUser', JSON.stringify(user)));
    for(let i = 0; i < coinsForUser.length; i++){
        coinsForUser[i].owner = 'resource:org.rec.User#' + coinsForUser[i].owner;
    }
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    console.log('selectCoinsByUser: API will respond with');
    console.log(JSON.stringify(coinsForUser));
    response.write(JSON.stringify(coinsForUser));
    response.end();

};

let selectListingsByUser = async  function(response, postData, getData){
    //Use username to log in
    let userId = getData.match('.?resource:org.rec.User%23(.*)')[1];
    let user = {
        userId : userId,
        user : 'resource:org.rec.User#' + userId
    };
    let listingsForUser = JSON.parse(await queryHL.query('fetchListingsByUser', JSON.stringify(user)));
    for(let i = 0; i < listingsForUser.length; i++) {
        let bidPrices = [];
        for(let j = 0; j < listingsForUser[i].bidPrices.length; j++){
            bidPrices.push(listingsForUser[i].bidPrices[j].bidPrice);
        }
        listingsForUser[i].bidPrices = bidPrices;
        listingsForUser[i].coin = 'resource:org.rec.Coin#' + listingsForUser[i].coin;
        listingsForUser[i].user = 'resource:org.rec.User#' + listingsForUser[i].user;
        listingsForUser[i].state =  listingsForUser[i].listingState;
    }
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    console.log('selectListingsByUser: API will respond with');
    console.log(JSON.stringify(listingsForUser));
    response.write(JSON.stringify(listingsForUser));
    response.end();
};

let selectBidsByUser = async function(response, postData, getData){
    let userId = getData.match('.?resource:org.rec.User%23(.*)')[1];
    let user = {
        userId : userId,
        user : 'resource:org.rec.User#' + userId
    };
    let bidsForUser = JSON.parse(await queryHL.query('fetchBidsByUser', JSON.stringify(user)));
    for(let i = 0; i < bidsForUser.length; i++) {
        bidsForUser[i].listing = 'resource:org.rec.CoinListing#' + bidsForUser[i].listing;
        bidsForUser[i].user = 'resource:org.rec.User#' + bidsForUser[i].user;
    }
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    console.log('selectBidsByUser: API will respond with');
    console.log(JSON.stringify(bidsForUser));
    response.write(JSON.stringify(bidsForUser));
    response.end();
};

let cancelCoin = async function(response, postData, getData){
    let coin = JSON.parse(postData);
    coin.coin = coin.coin.match('resource:org.rec.Coin#(.*)')[1];
    invokeHL.invoke('cancelCoin',JSON.stringify(coin));
    console.log('Cancel Coin invoked');
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    response.write(JSON.stringify('Success!'));
    response.end();
};

let createBid = async function(response, postData, getData){
    let bid = JSON.parse(postData);
    console.log(bid);
    bid.listing = bid.listing.match('resource:org.rec.CoinListing#(.*)')[1];
    bid.user = bid.user.match('resource:org.rec.User#(.*)')[1];
    invokeHL.invoke('createBid',JSON.stringify(bid));
    console.log('Create Bid invoked');
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    response.write(JSON.stringify('Success!'));
    response.end();
};

let createCoinListing = async function(response, postData, getData){
    let coinListing = JSON.parse(postData);
    coinListing.coin = coinListing.coin.match('resource:org.rec.Coin#(.*)')[1];
    invokeHL.invoke('createCoinListing',JSON.stringify(coinListing));
    console.log('Coin Listing invoked');
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    response.write(JSON.stringify('Success!'));
    response.end();
};


let endListing = async function(response, postData, getData){
    let coinListing = JSON.parse(postData);
    console.log(coinListing);
    coinListing.listing = coinListing.listing.match('resource:org.rec.CoinListing#(.*)')[1];
    invokeHL.invoke('endListing',JSON.stringify(coinListing));
    console.log('End Listing invoked');
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    response.write(JSON.stringify('Success!'));
    response.end();
};

exports.user = user;
exports.selectActiveListings = selectActiveListings;
exports.selectListedCoins = selectListedCoins;
exports.selectCoinsByUser = selectCoinsByUser;
exports.selectListingsByUser = selectListingsByUser;
exports.selectBidsByUser = selectBidsByUser;
exports.cancelCoin = cancelCoin;
exports.createBid = createBid;
exports.createCoinListing = createCoinListing;
exports.endListing = endListing;