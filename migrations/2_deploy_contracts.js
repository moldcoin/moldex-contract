let contract = artifacts.require('./SampleToken.sol');
let moldex = artifacts.require('./Moldex.sol');

module.exports = function(deployer) {
    deployer.deploy(contract, { gas:6721975, gasPrice: 100000000})
};
