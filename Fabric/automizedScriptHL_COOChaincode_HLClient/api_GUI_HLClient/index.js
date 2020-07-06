let server = require('./api_files/server');
let router = require('./api_files/router');
let requestHandlers = require('./api_files/requestHandlers');
let hlClient = require('./hl_client/client');


let handle = {};
handle['/api/User'] = requestHandlers.user;
handle['/api/queries/selectActiveListings'] = requestHandlers.selectActiveListings;
handle['/api/queries/selectListedCoins'] = requestHandlers.selectListedCoins;
handle['/api/queries/selectCoinsByUser'] = requestHandlers.selectCoinsByUser;
handle['/api/queries/selectListingsByUser'] = requestHandlers.selectListingsByUser;
handle['/api/queries/selectBidsByUser'] = requestHandlers.selectBidsByUser;
handle['/api/CancelCoin'] = requestHandlers.cancelCoin;
handle['/api/PlaceBid'] = requestHandlers.createBid;
handle['/api/ListCoin'] = requestHandlers.createCoinListing;
handle['/api/EndListing'] = requestHandlers.endListing;

hlClient.register(true)
    .then(server.start(router.route, handle))
    .catch( err => console.log(err));

