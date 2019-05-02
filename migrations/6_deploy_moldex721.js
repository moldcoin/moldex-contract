let moldex = artifacts.require('./Moldex721.sol');

module.exports = function(deployer) {
    deployer.deploy(moldex,  web3.eth.coinbase, { gas:6721975, gasPrice: 100000000})
};
