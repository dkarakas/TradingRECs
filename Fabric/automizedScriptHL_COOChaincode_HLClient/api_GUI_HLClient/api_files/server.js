let http = require('http');
let url = require('url');

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers' : 'content-type',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Max-Age': 2592000, // 30 days
    /** add other headers as per requirement */
};


function start(route, handle) {
    function onRequest(request, response) {
        let pathname = url.parse(request.url).pathname;
        console.log('With parameters: ' + url.parse(request.url).search);
        let postData = '';
        console.log('Request for ' + pathname + ' received.');
        request.setEncoding('utf8');
        //To allow CROS post data
        if (request.method === 'OPTIONS') {
            console.log('OPTIONS METHOD HIT');
            response.writeHead(204, headers);
            response.end();
            return;
        }

        request.on('data', function(postDataChunk) {
            postData += postDataChunk;
            console.log('Received POST data chunk '+
                postDataChunk + '.');
        });

        request.on('end', function() {
            route(handle, pathname, response, postData, url.parse(request.url).search);
        });

        request.on('error', (err) => console.log('Error: ' + err));

    }
    http.createServer(onRequest).listen(3000);
    console.log('Server has started.');
}
exports.start = start;
