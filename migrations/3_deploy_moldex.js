let moldex = artifacts.require('./Moldex.sol');

module.exports = function(deployer) {
    deployer.deploy(moldex,  web3.eth.coinbase, { gas:6721975, gasPrice: 100000000})
};

//set address if you deploy testnet
// module.exports = function(deployer) {
//     deployer.deploy(moldex,  "0xcC6f32fEdeF3dEeb5A99CbA52ACec9fFc6DA6637", { gas:6721975, gasPrice: 100000000})
// };


