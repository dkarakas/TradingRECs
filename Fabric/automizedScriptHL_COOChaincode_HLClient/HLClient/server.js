let http = require('http');
let url = require('url');

function start(route, handle) {
    function onRequest(request, response) {
        let pathname = url.parse(request.url).pathname;
        console.info(url.parse(request.url).search);
        let postData = '';
        console.log('Request for ' + pathname + ' received.');
        request.setEncoding('utf8');

        request.addListener('data', function(postDataChunk) {
            postData += postDataChunk;
            console.log('Received POST data chunk '+
                postDataChunk + '.');
        });

        request.addListener('end', function() {
            route(handle, pathname, response, postData);
        });

    }
    http.createServer(onRequest).listen(3000);
    console.log('Server has started.');
}
exports.start = start;
