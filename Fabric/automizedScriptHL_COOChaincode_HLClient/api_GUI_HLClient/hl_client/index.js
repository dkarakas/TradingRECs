let server = require('./server');
let router = require('./router');
let requestHandlers = require('./requestHandlers');

let handle = {};
handle['/'] = requestHandlers.start;
handle['/start'] = requestHandlers.start;
handle['/upload'] = requestHandlers.upload;
handle['/api/User'] = requestHandlers.user;
handle['/api/queries/selectActiveListings'] = requestHandlers.selectActiveListings;
handle['/api/queries/selectListedCoins'] = requestHandlers.selectListedCoins;

server.start(router.route, handle);
