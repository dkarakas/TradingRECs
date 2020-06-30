const inquirer = require('inquirer');


let chooseListing = (arrListings) => {
        const questions = [
            {
                name: 'listingChoice',
                type: 'list',
                message: 'Choose a listing:',
                choices: arrListings
            }
        ];
        return inquirer.prompt(questions);
};

let chooseBid = (bidOptions) => {
    const questions = [
        {
            name: 'bidChoice',
            type: 'list',
            message: 'Choose a bid:',
            choices: bidOptions
        }
    ];
    return inquirer.prompt(questions);
};

let bidOrSettle = () => {
    const question = [
        {
            name: 'bidOrSettle',
            type: 'list',
            message: 'Bid or check a particular bid :',
            choices: ['bid', 'Check a bid']
        }
    ];
    return inquirer.prompt(question);
};

let bid = (minprice) => {
    const question = [
        {
            name: 'bid',
            type: 'number',
            message: 'How much would you like to bid :',
            validate : function (input) {
                return input >= minprice;
            }
        }
    ];
    return inquirer.prompt(question);
}

let dealOrNoDeal = () => {
    const question = [
        {
            name: 'cond',
            type: 'list',
            message: 'Are you okay with the conditions?:',
            choices: ['yes', 'no']
        }
    ];
    return inquirer.prompt(question);
};

let listingOptions = () => {
    const question = [
        {
            name: 'listingOptions',
            type: 'list',
            message: 'List REC, check bids, or retire :',
            choices: ['List REC', 'Check bids for listing', 'Retire']
        }
    ];
    return inquirer.prompt(question);
};

let listREC = (RECs) => {
    const questions = [
        {
            name: 'listingChoice',
            type: 'list',
            message: 'Choose a REC:',
            choices: RECs
        },
        {
            name: 'price',
            type: 'integer',
            message: 'Choose a min price:',
            validate: function (input) {
                return input >= 0;
            }
        },
        {
            name: 'length',
            type: 'integer',
            message: 'Choose for how long:',
            validate: function (input) {
                return input >= 0;
            }
        }
    ];
    return inquirer.prompt(questions);
};

let chooseBidSeller = (bidOptions) => {
    const questions = [
        {
            name: 'bidChoice',
            type: 'list',
            message: 'Choose a bid:',
            choices: bidOptions
        },
        {
            name: 'length',
            type: 'integer',
            message: 'Choose how long the proposal will last:',
            validate: function (input) {
                return input >= 0;
            }
        },
        {
            name: 'finalPrice',
            type: 'integer',
            message: 'Choose the final price:',
            validate: function (input) {
                return input >= 0;
            }
        }
    ];
    return inquirer.prompt(questions);
};

let retireREC = (RECs) => {
    const questions = [
        {
            name: 'retireREC',
            type: 'list',
            message: 'Choose a REC:',
            choices: RECs
        }
    ];
    return inquirer.prompt(questions);
};


module.exports = {
    bidOrSettle: bidOrSettle,
    chooseListing: chooseListing,
    bid: bid,
    chooseBid : chooseBid,
    dealOrNoDeal : dealOrNoDeal,
    listingOptions : listingOptions,
    listREC : listREC,
    chooseBidSeller : chooseBidSeller,
    retireREC : retireREC
};
