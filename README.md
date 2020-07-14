# Making Renewable Energy Certificates Efficient, Trustworthy, and Private

This is an implementation of a system for trading RECs in which end-users who trade RECs do not need to trust 
energy producers or energy companies. The implementation is a proof of concept with simplifications such 
as a single REC aggregator. 
End-users that want to trade RECs are using node.JS application located in the clientApplication directory. 
Currently, all transactions are submitted through the middlewareAPI. 

## Getting Started

### Prerequisites

You need:
* Algorand - Download and install Algorand's CLI. Follow 
    the Algorand's instructions [here](https://developer.algorand.org/docs/build-apps/setup/#3-run-your-own-node).
* Node.js - [Download and install Node.js](https://nodejs.org/en/download/) ^13.0. 
* Azure Sphere - we use the [Azure Sphere Dev Kit](https://www.seeedstudio.com/Azure-Sphere-MT3620-Development-Kit-US-Version-p-3052.html).
Also, download and install [Azure Sphere SDK](https://docs.microsoft.com/en-us/azure-sphere/install/overview). 


### Top-level directory layout

    .
    ├── algorandNetwork                   # Files related to Algorand private network
    ├── azureSphereApplication            # The Azure Sphere Application combined with wolfssl
    ├── clientApplication                 # End-user interface with the system
    ├── middlewareAPI                     # The API connecting the Azure Sphere and client application to Aglorand
    │   ├── api_files                     # The API files
    │   ├── certificates                  # Certificates related to TLS
    │   ├── keys                          # The keys of the middleware API that represent energy company
    │   └── spec                          # e2e tests for basic middleware API functionality
    ├── scripts                           # Bash scripts that simplify manual testing
    ├── LICENSE
    └── README.md


### Quick Install

You need to install all Node.js modules to run the middlewareAPI:
```
cd ./Algorand/middlewareAPI
npm install
``` 

You need to install all Node.js modules to start the client application:
```
cd ./Algorand/clientApplication
npm install
``` 

### Set up environment

This project has a local CA that is used to sign the certificate of the middlewareAPI. 
If you need to create a certificate, make sure that CN is set to your ip address.
You can follow the steps [here](https://github.com/anders94/https-authorized-clients) or
[here](https://engineering.circle.com/https-authorized-certs-with-node-js-315e548354a2).

Set up an Algorand private network by running the command in the root directory of this project:
```
./Algorand/algorandNetwork/start_network.sh
```

For setting up Azure Sphere and deploying the application,
 please follow [Microsoft's documentation](https://docs.microsoft.com/en-us/azure-sphere/install/overview)

## Testing
Test the basic middleware API functionality using:
```
npm test
```
## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

