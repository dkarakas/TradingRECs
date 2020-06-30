let server = require('./api_files/server');
let router = require('./api_files/router');
let requestHandlers = require('./api_files/requestHandlers');

let handle = {};
handle['/register'] = requestHandlers.register;
handle['/requestTransactions'] = requestHandlers.requestTransactions;

handle['/newCert'] = requestHandlers.newCert;
handle['/getParams'] = requestHandlers.getParams;
handle['/showAvailableCerts'] = requestHandlers.showAvailableCerts;
handle['/listCert'] = requestHandlers.listCert;
handle['/getBids'] = requestHandlers.getBids;
handle['/bidListing'] = requestHandlers.bidListing;
handle['/showListings'] = requestHandlers.showListings;
handle['/proposeSettle'] = requestHandlers.proposeSettle;
handle['/checkBidWon'] = requestHandlers.checkBidWon;
handle['/settleCert'] = requestHandlers.settleCert;
handle['/retireCert'] = requestHandlers.retireCert;
handle['/getListingInfo'] = requestHandlers.getListingInfo;
handle['/getSettleInfo'] = requestHandlers.getSettleInfo;

server.start(router.route, handle);

