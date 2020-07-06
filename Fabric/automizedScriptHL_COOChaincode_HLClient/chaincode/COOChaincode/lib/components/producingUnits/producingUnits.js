const Ajv = require('ajv');
const ajv = Ajv();
const JSONSchemas = require('../../schemasValidation/JSONSchemas');

var createProducingUnit = async function(ctx, producingUnit){
    console.info('============= Begin : Creating Producing Unit ===========');
    let producingUnitObj = JSON.parse(producingUnit);

    let valid = ajv.validate(JSONSchemas.schemaProducingUnit, producingUnitObj);
    if (!valid) {
        console.log(ajv.errors);
        throw new Error(ajv.errors);
    }

    console.info('Attempting to create the following SM:');
    console.info(producingUnit);

    await ctx.stub.putState(JSON.parse(producingUnit).smartMeter, Buffer.from(producingUnit));

    console.info('============= END : Creating Producing Unit ===========');
};

module.exports = {createProducingUnit : createProducingUnit};
