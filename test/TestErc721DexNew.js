var MyToken721 = artifacts.require("./MyToken721.sol");
var MyToken20 = artifacts.require("./MyToken20.sol");
var moldex = artifacts.require("./Moldex721.sol");
var BN = require("bn.js");
var encodeCall = require("./helpers/encodeCall");

contract("Test Modlex 721", function(accounts) {
    const coinBase = accounts[0];
    const subAccount = accounts[1];
    const privateKeys = [
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", // key of accounts[0]
        "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f" // key of accounts[1]
    ];

    it("coinbase should have mytoken20", async function() {
        const token = await MyToken20.deployed();
        const amount = await token.balanceOf(coinBase);
        const initialSupply = await token.totalSupply();
        const name = await token.name();
        const symbol = await token.symbol();
        const token = await MyToken20.deployed();
        const amount = await token.balanceOf(coinBase);
        const initialSupply = await token.totalSupply();
        const name = await token.name();
        const symbol = await token.symbol();
    });
});
