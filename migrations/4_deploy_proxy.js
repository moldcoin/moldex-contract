let proxy = artifacts.require('./proxy/OwnedUpgradeabilityProxy.sol');

module.exports = function(deployer) {
    deployer.deploy(proxy, { gas:6721975, gasPrice: 100000000})
};

