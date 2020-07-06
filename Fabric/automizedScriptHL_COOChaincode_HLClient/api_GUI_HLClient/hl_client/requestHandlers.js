
let start = function (response, postData) {
    console.log('Request handler \'start\' was called.');
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('stdout');
    response.end();

};

let upload = function (response, postData) {
    console.log('Request handler \'upload\' was called.');
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.write('Hello Upload');
    response.end();
};

let user = function(response, postData){
    response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept'});
    let user = [];
    user.push({
        user: 'User0'
    });
    console.log(JSON.stringify(user));
    response.write(JSON.stringify(user));
    response.end();
};

let selectActiveListings = function(response, postData){
    console.log("TODO");
};

let selectListedCoins = function(response, postData){
    console.log("TODO");
};
//createCoinListing
//endListing
//createBid
//fetchActiveListings
//fetchListingsByUser
//fetchListedCoins
//fetchCoinsByUser
//fetchListingsByUser
//fetchBidsByUser

exports.start = start;
exports.upload = upload;
exports.user = user;
exports.selectActiveListings = selectActiveListings;
exports.selectListedCoins = selectListedCoins;
