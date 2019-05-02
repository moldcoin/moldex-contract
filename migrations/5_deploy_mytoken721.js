let MyToken721 = artifacts.require('./MyToken721.sol');

module.exports = function(deployer) {
    deployer.deploy(MyToken721, { gas:6721975, gasPrice: 100000000})
};
