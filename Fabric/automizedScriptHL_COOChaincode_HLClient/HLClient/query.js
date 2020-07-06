/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', 'first-network', 'connection-org1.json');



async function allReadings (contract,smartMeter) {
    const result = await contract.evaluateTransaction('allCoinsForProdSM', smartMeter);
    console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
    console.log('\n');

    let objectForMultiple = JSON.parse(JSON.parse(result.toString()));

    console.log(objectForMultiple[0]);
    objectForMultiple.forEach(function (entry) {
        console.log(`Reading: ${entry.Key}`);
        console.log(JSON.stringify(entry.Record));
    });
}


async function singleReading (contract, key, readingNumber) {
    const result = await contract.evaluateTransaction('readingForProdSM', key, readingNumber);
    console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
    console.log('\n');
}


async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log('An identity for the user "user1" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: 'user1', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('coo');

        // Evaluate the specified transaction.
        // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
        // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
        // await contract.evaluateTransaction('updatePK');

        // allReadings(contract,'z757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc');
        // singleReading(contract,'c757e931a43a8c54123a73616aa8763cccad474f68d7659de7bb667a51f19fb2abce56ee977e55796498a4787563a3ea68b78f67336d0884f7dbfb9480d9eadc','9');

        // const result = await contract.evaluateTransaction('allUsers');
        // console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
        // const result = await contract.evaluateTransaction('fetchActiveListings');
        // console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
        var user = {
            userId : 'User2',
            user: 'resource:org.rec.User#User0'
        }
        // const result = await contract.evaluateTransaction('fetchListingsByUser', JSON.stringify(user));
        // console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
        // const result = await contract.evaluateTransaction('fetchBidsByUser', JSON.stringify(user));
        // console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
        const result = await contract.evaluateTransaction('fetchCoinsByUser', JSON.stringify(user));
        console.info(JSON.parse(result.toString()));
        let arr = JSON.parse(result.toString());
        console.log(JSON.parse(arr));
        // const result = await contract.evaluateTransaction('fetchListedCoins');
        // console.log(result);
        // console.log(result.toString())
        // console.log(`Transaction has been evaluated, result is: ${JSON.parse(result)}`);
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}



main();
