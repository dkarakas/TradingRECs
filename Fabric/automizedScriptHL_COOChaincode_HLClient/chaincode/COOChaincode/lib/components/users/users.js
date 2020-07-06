const Ajv = require('ajv');
const ajv = Ajv();
const JSONSchemas = require('../../schemasValidation/JSONSchemas');
const helpers = require('../../helpers/utils');

var createUser = async function(ctx, userInfo, producingUnits){
    console.info('============= BEGIN : Creating User And Producing Unit ===========');
    let userInfoObj = JSON.parse(userInfo);
    console.info('Attempting to create User and Producing Unit from:');
    console.info(userInfo);
    let valid = ajv.validate(JSONSchemas.schemaUserInfo, userInfoObj);
    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }

    let numUsersAsBytes = await ctx.stub.getState('User');
    if (!numUsersAsBytes || numUsersAsBytes.length === 0) {
        throw new Error(`User key does not exist!`);
    }

    let name = userInfoObj.owner.split(" ");
    let user = {
        userId : `User` + numUsersAsBytes.toString(),
        firstName :  name[0],
        lastName : name[1],
        balance : 100,
        producingUnits : [userInfoObj.smartMeter],
        bids : [],
        coinListings : []
    };

    console.info('Creating user with the following info:');
    console.info(user);

    //Getting all Users in parallel
    let stringUsers = await helpers.getAllEntries(ctx,'User',0 , parseInt(numUsersAsBytes.toString()));

    stringUsers.forEach(
        user => JSON.parse(user).producingUnits.forEach(
            producingUnit => {
                if(producingUnit === userInfoObj.smartMeter){
                    throw new Error(`Smart Meter already exist`);
                }
            }
        )
    );

    let promiseNewUser =  ctx.stub.putState(`User` + numUsersAsBytes.toString(), Buffer.from(JSON.stringify(user)));
    let numUsers = parseInt(numUsersAsBytes.toString()) + 1;
    let promiseNumUsers =  ctx.stub.putState('User', Buffer.from(numUsers.toString()));
    await Promise.all([promiseNewUser, promiseNumUsers]);

    let ProducingUnit = userInfoObj;
    ProducingUnit.coins = [];
    ProducingUnit.user = user.userId;
    await producingUnits.createProducingUnit(ctx, JSON.stringify(ProducingUnit));
    console.info('============= END : Creating User And Producing Unit ===========');
};



//TODO:  Create on function for fetching all of a particular type such as: Users, Listing, etc.
var allUsers = async function(ctx){
    console.info('============= Begin : All Users ===========');

    var numUsersAsBytes = await ctx.stub.getState('User');
    if (!numUsersAsBytes || numUsersAsBytes.length === 0) {
        throw new Error(`SM key does not exist!`);
    }
    //Getting all Users in parallel
    return await helpers.getAllEntries(ctx,'User',0 , parseInt(numUsersAsBytes.toString()));
};

module.exports = {createUser : createUser, allUsers: allUsers};