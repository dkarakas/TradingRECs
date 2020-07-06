

var getAllEntries = async function (ctx, key, startRange, endRage) {
    let promises = [];
    let result = [];
    console.log(key);
    console.log(startRange.toString());
    console.log(endRage.toString());
    for(let i = startRange; i < endRage; i++){
        let keyRequestedPromise = ctx.stub.getState(key + i.toString());
        promises.push(keyRequestedPromise);
    }
    await Promise.all(promises);
    for(let i = 0; i < promises.length; i++)
    {
        if (!promises[i] || promises[i].length === 0) {
            throw new Error(`${key + i.toString()} does not exist`);
        }
        promises[i].then( resultPromise => result.push(resultPromise.toString()));
    }
    return result;
};

module.exports = {getAllEntries : getAllEntries};