let https = require('https');
let url = require('url');
let fs = require('fs');
const config = require('../config');

var options = {
    key: fs.readFileSync(config.certificates.middlewareAPIKey),
    cert: fs.readFileSync(config.certificates.middlewareAPI),
    ca: fs.readFileSync(config.certificates.AzureSphereRoot),
    requestCert: true,
    rejectUnauthorized: false //Still allows to connect even if not signed with root CA.
};

function start(route, handle) {
    function onRequest(request, response) {
        let pathname = url.parse(request.url).pathname;
        console.log('With parameters: ' + url.parse(request.url).search);
        let postData = '';
        console.log('Request for ' + pathname + ' received.');

        request.on('data', function(postDataChunk) {
            postData += postDataChunk;
            // console.log('Received POST data chunk '+
            //     postDataChunk + '.');
        });

        request.on('end', function() {
            route(handle, pathname, request, response, postData);
        });

        request.on('error', (err) => console.log('Error: ' + err));
    }
    https.createServer(options, onRequest).listen(443);
    console.log('Server has started.');
}
exports.start = start;
