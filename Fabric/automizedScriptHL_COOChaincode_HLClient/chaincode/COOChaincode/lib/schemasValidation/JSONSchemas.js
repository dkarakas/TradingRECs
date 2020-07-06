//Schemas are default to $schema - draft 6 meta-schema !!!!
var schemaUser = {
    // "id": "user.json",
    "title": "User",
    "description": "User describing the current balance",
    "type" : "object",
    "properties" : {
        "userId" : { "type" : "string"},
        "firstName" : { "type" : "string" },
        "lastName" : { "type" : "string" },
        "balance" : { "type" : "integer", "minimum" : 0 },
        "producingUnits" : {
            "type": "array",
            "times":
                {
                    "type": "string",
                },
            "maxItems" : 1
        },
        "bids" : {
            "type": "array",
            "times":
                {
                    "type": "string",
                },
            "maxItems" : 0
        },
        "coinListings" : {
            "type": "array",
            "times":
                {
                    "type": "string",
                },
            "maxItems" : 0
        }
    },
    "required" : ["userId", "firstName", "lastName", "balance", "producingUnits", "Bids", "CoinListings"],
    "additionalProperties": false,
};

var schemaCoinListing = {
    "title" : "Coin Listing",
    "description" : "Describes the current coin for sale",
    "type" : "object",
    "properties" : {
        "$class" : { "type" : "string"},
        "listingId" : { "type" : "string"},
        "minPrice" : { "type" : "integer", "minimum" : 0},
        "coin" : { "type" : "string"},
    },
    "required" : ["listingId", "minPrice", "coin"],
    "additionalProperties": false,
};

var schemaBid = {
    "title" : "Bid",
    "description" : "Describes each bid",
    "type" : "object",
    "properties" : {
        "bidId" : { "type" : "string" },
        "bidPrice" : { "type" : "integer", "minimum" : 0 },
        "listing" :  { "type" : "string" },
        "user" : { "type" : "string" }
    },
    "required" : ["bidId", "bidPrice", "listing", "user"]
};

//TODO: Not sure if Coin and single reading should be combined. Maybe coins can combine multiple readings for greater value?
var schemaCoin = {
    // "id": "coin.json",
    "title" : "Coin",
    "description" : "Describes each coin",
    "type" : "object",
    "properties" : {
        "coinId" : { "type" : "integer", "minimum" : 0, "exclusiveMinimum": true },
        "state" : { "enum" : ["LISTED", "ACTIVE", "CANCELLED"] },
        "reading" :  { "type" : "integer", "minimum" : 0, "exclusiveMinimum": true },
        "owner" : { "type" : "integer", "minimum" : 0, "exclusiveMinimum": true }
    },
    "required" : ["coinId", "state", "producingUnit", "owner"]
};

var schemaReading = {
    // "id": "reading.json",
    "title" : "Reading",
    "description" : "Describes each reading from the smart meter",
    "type" : "object",
    "properties" : {
        "message" : { "type" : "string" },
        "signature" : {
            "type" : "object",
            "properties" : {
                "type" : { "type" : "string" },
                "data" : { "type" : "array" , "items" : {"type" : "integer"}}
            }
        }
    },
    "required" : ["message", "signature"]
};


var schemaReadingMessage = {
    // "id": "reading.json",
    "title" : "Reading",
    "description" : "Describes each reading from the smart meter",
    "type" : "object",
    "properties" : {
                "smartMeter" : { "type" : "string"},
                "meterreading" : { "type" : "string"},//TODO: Change to number
                "timestamp" : { "type" : "string" }//need to figure out formatting
    },
    "required" : ["smartMeter", "meterreading", "timestamp"]
};


var schemaUserInfo = {
    // "$id": "smartMeter.json",
    "title" : "Smart Meter",
    "description" : "Describes the producing unit",
    "type" : "object",
    "properties" : {
        "smartMeter": {"type": "string"},
        "owner": {"type": "string"},
        "operationalSince": {"type": "string"},
        "capacityWh": {"type": "string"},
        "lastSmartMeterReadWh": {"type": "string"},
        "active": {"type": "string"},
        "lastSmartMeterRead": {"type": "string"},
        "country": {"type": "string"},
        "region": {"type": "string"},
        "zip": {"type": "string"},
        "city": {"type": "string"},
        "street": {"type": "string"},
        "houseNumber": {"type": "string"},
        "gpsLatitude": {"type": "string"},
        "gpsLongitude": {"type": "string"},
        "assetType": {"type": "string"},//Maybe enum instead?
        "certificatesCreatedForWh": {"type": "string"}, //Only 1kWh?
        "lastSmartMeterCO2OffsetRead": {"type": "string"},
        "cO2UsedForCertificate": {"type": "string"},
        "complianceRegistry": {"type": "string"},
        "otherGreenAttributes": {"type": "string"},
        "typeOfPublicSupport": {"type": "string"},
        "maxOwnerChanges": {"type": "string"}
    },
    "required" : ["smartMeter", "owner"]
};


var schemaProducingUnit = {
    // "$id": "smartMeter.json",
    "title" : "Smart Meter",
    "description" : "Describes the producing unit",
    "type" : "object",
    "properties" : {
        "smartMeter": {"type": "string"},
        "owner": {"type": "string"},
        "operationalSince": {"type": "string"},
        "capacityWh": {"type": "string"},
        "lastSmartMeterReadWh": {"type": "string"},
        "active": {"type": "string"},
        "lastSmartMeterRead": {"type": "string"},
        "country": {"type": "string"},
        "region": {"type": "string"},
        "zip": {"type": "string"},
        "city": {"type": "string"},
        "street": {"type": "string"},
        "houseNumber": {"type": "string"},
        "gpsLatitude": {"type": "string"},
        "gpsLongitude": {"type": "string"},
        "assetType": {"type": "string"},//Maybe enum instead?
        "certificatesCreatedForWh": {"type": "string"}, //Only 1kWh?
        "lastSmartMeterCO2OffsetRead": {"type": "string"},
        "cO2UsedForCertificate": {"type": "string"},
        "complianceRegistry": {"type": "string"},
        "otherGreenAttributes": {"type": "string"},
        "typeOfPublicSupport": {"type": "string"},
        "maxOwnerChanges": {"type": "string"},

        "coins" : {
            "type": "array",
            "times":
                {
                    "type": "string",
                },
            "maxItems" : 0
        },
        "user" : {"type": "string"}
    },
    "required" : ["smartMeter", "owner", "coins", "user"]
};

module.exports = {schemaUserInfo : schemaUserInfo, schemaUser : schemaUser, schemaCoinListing : schemaCoinListing, schemaBid : schemaBid, schemaCoin : schemaCoin, schemaReading : schemaReading, schemaProducingUnit : schemaProducingUnit, schemaReadingMessage : schemaReadingMessage};