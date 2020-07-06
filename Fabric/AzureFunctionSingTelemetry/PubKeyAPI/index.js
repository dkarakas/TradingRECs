const msRestAzure = require('ms-rest-azure');
var KeyVault = require('azure-keyvault');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.query.pubkey) {
        // The ms-rest-azure library allows us to login with MSI by providing the resource name. In this case the resource is Key Vault.
        const credentials = await msRestAzure.loginWithAppServiceMSI({resource: 'https://vault.azure.net'});
        const keyVaultClient = new KeyVault.KeyVaultClient(credentials);

        var vaultUri = "https://" + "keysigntelemetry" + ".vault.azure.net/";
        const pkVault = await keyVaultClient.getKey(vaultUri,"SignTelemetryKey", "");
        var response = {publicKey : pkVault, formattedCryptoSuit : "04"+ pkVault.key.x.toString('hex') +  pkVault.key.y.toString('hex')}
        context.res = {
            status: 200,
            body: JSON.stringify(response),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    else {
        context.res = {
            status: 400,
            body: "This api is only for requesting public key! Please, pass appropriate argument."
        };
    }
};