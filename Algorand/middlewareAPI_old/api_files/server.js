let https = require('https');
let url = require('url');
let fs = require('fs');

var options = {
    key: fs.readFileSync('./certificates/server-key.pem'),
    cert: fs.readFileSync('./certificates/server-crt.pem'),
    ca: fs.readFileSync('./certificates/rootCA.pem'),
    requestCert: true,
    rejectUnauthorized: false
};

function start(route, handle) {
    function onRequest(request, response) {
        let pathname = url.parse(request.url).pathname;
        console.log('With parameters: ' + url.parse(request.url).search);
        let postData = '';
        console.log('Request for ' + pathname + ' received.');

        request.on('data', function(postDataChunk) {
            postData += postDataChunk;
            console.log('Received POST data chunk '+
                postDataChunk + '.');
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
