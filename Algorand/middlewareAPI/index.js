let server = require('./api_files/server');
let router = require('./api_files/router');
let requestHandlers = require('./api_files/requestHandlers');

let handle = {};
handle['/metadataUpdate'] = requestHandlers.metadataUpdate;
handle['/requestTransactions'] = requestHandlers.requestTransactions;

handle['/newREC'] = requestHandlers.newREC;
handle['/getParams'] = requestHandlers.getParams;
handle['/showAvailableRECs'] = requestHandlers.showAvailableRECs;
handle['/listREC'] = requestHandlers.listREC;
handle['/getBids'] = requestHandlers.getBids;
handle['/getAccount'] = requestHandlers.getAccount;
handle['/bidListing'] = requestHandlers.bidListing;
handle['/showListings'] = requestHandlers.showListings;
handle['/proposeSettle'] = requestHandlers.proposeSettle;
handle['/checkBidWon'] = requestHandlers.checkBidWon;
handle['/settleREC'] = requestHandlers.settleREC;
handle['/retireREC'] = requestHandlers.retireREC;
handle['/getListingInfo'] = requestHandlers.getListingInfo;
handle['/getSettleInfo'] = requestHandlers.getSettleInfo;

server.start(router.route, handle);


