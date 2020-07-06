const https = require('https');

var getURL = function(){
    return new Promise((resolve, reject)=>{
        const request = https.get('https://siriussigntelemetry.azurewebsites.net/api/PubKeyAPI?code=4fYaX4IxpQWNfpwLjGUx/EnUQHuYsoQhDVEmasMKXb/9OugE7E5wMQ==&pubkey=%22test%22', res => onHttpGetResponse(res, resolve, reject));
        request.on('error', reject);
        request.end();
    });
}

var onHttpGetResponse = function(response, resolve, reject) {
    var receivedResponse = '';

    if (response.status >= 400) {
        reject(`Request to ${response.url} failed with HTTP ${response.status}`);
    }

    response.on('data', chunk => receivedResponse += chunk.toString());

    response.on('end', () => resolve(receivedResponse));
};

module.exports = {getURL : getURL};