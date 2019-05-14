var MyToken721 = artifacts.require("./MyToken721.sol");
var MyToken20 = artifacts.require("./MyToken20.sol");
var moldex = artifacts.require("./Moldex721New.sol");
var BN = require("bn.js");
var encodeCall = require("./helpers/encodeCall");

contract("Test Modlex 721", function(accounts) {
    const coinBase = accounts[0];
    const subAccount = accounts[1];
    const privateKeys = [
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", // key of accounts[0]
        "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f" // key of accounts[1]
    ];

    it("[1]coinbase should have mytoken20", async function() {
        const token = await MyToken20.deployed();
        const amount = await token.balanceOf(coinBase);
        const initialSupply = await token.totalSupply();
        const name = await token.name();
        const symbol = await token.symbol();
        assert.equal(amount, 1000000000000000000000);
        assert.equal(initialSupply, 1000000000000000000000);
        assert.equal(name, "MyToken20");
        assert.equal(symbol, "MTKN20");
    });

    it("[2]should mint 2 erc721 token", async function() {
        const token = await MyToken721.deployed();
        await token.mint(); // tokenId 0
        await token.mint(); //tokenId 1
        const owner = await token.ownerOf(0);
        const amount = await token.balanceOf(coinBase);
        const name = await token.name();
        const symbol = await token.symbol();
        assert.equal(owner, coinBase);
        assert.equal(amount, 2);
        assert.equal(name, "MyToken");
        assert.equal(symbol, "MTKN");
    });

    it("[3]should approve erc721 token to moldex contract", async function() {
        const token = await MyToken721.deployed();
        const moldexI = await moldex.deployed();
        await token.approve(moldex.address, 1);
        const approved = await token.getApproved(1);
        assert.equal(approved, moldexI.address);
    });

    it("[4]should approve mold token to modlex contract", async function() {
        const token = await MyToken20.deployed();
        const moldexI = await moldex.deployed();
        const amount = 10000;
        await token.approve(moldexI.address, amount);
        const allowance = await token.allowance(coinBase, moldexI.address);
        assert.equal(
            amount,
            allowance,
            "approve amount should be equal to allwances"
        );
    });

    it("[5]should transfer mold to subAccount", async function() {
        const token = await MyToken20.deployed();
        await token.transfer(subAccount, 5000);
        const subAccountMold = await token.balanceOf(subAccount);
    });

    it("[6]subaccount should approve 2000 mold to moldex", async function() {
        const token = await MyToken20.deployed();
        const moldexI = await moldex.deployed();
        const amount = 20000;
        await token.approve(moldexI.address, amount, { from: subAccount });
        const allowance = await token.allowance(subAccount, moldexI.address);
        assert.equal(
            amount,
            allowance,
            "approve amount should be equal to allwances"
        );
    });

    it("should trade tokenId 1 with 1000 mold", async function() {
        const token20 = await MyToken20.deployed();
        const token721 = await MyToken721.deployed();
        const moldexI = await moldex.deployed();
        const tokenId = new BN("1");
        const mold = new BN("1000");
        // orderHash
        const orderHashBase =
            moldexI.address +
            token721.address.slice(2, 42) +
            coinBase.slice(2, 42) +
            convertHexString(tokenId) +
            token20.address.slice(2, 42) +
            convertHexString(mold);
        const orderHash = web3.sha3(orderHashBase, { encoding: "hex" });
        const orderHashSign = web3.eth.sign(coinBase, orderHash);
        // r,s,v 721token owner
        const v_base1 = new BN(Number(orderHashSign.slice(130, 132)) + 27);
        const [r1, s1, v1] = [
            orderHashSign.slice(0, 66),
            "0x" + orderHashSign.slice(66, 130),
            v_base1.toString(10)
        ];
        // tradehash
        const tradeHashBase = orderHash + subAccount.slice(2, 42);
        const tradeHash = web3.sha3(tradeHashBase, { encoding: "hex" });
        const tradeHashSign = web3.eth.sign(subAccount, tradeHash);
        const v2_base = new BN(Number(tradeHashSign.slice(130, 132)) + 27);
        const [r2, s2, v2] = [
            tradeHashSign.slice(0, 66),
            "0x" + tradeHashSign.slice(66, 130),
            v2_base.toString(10)
        ];
        const tradeValues = [tokenId.toString(10), "1000"];
        const tradeAddresses = [
            token721.address,
            token20.address,
            coinBase,
            subAccount
        ];
        const rs = [r1, s1, r2, s2];
        const v = [v1, v2];
        console.log(tradeValues, tradeAddresses, rs, v);
        const allowance = await token20.allowance(subAccount, moldexI.address);
        console.log("allowance: ", allowance);
        const approved = await token721.getApproved(1);
        console.log("approve721: ", approved, moldexI.address);
        await moldexI.trade(tradeValues, tradeAddresses, v, rs);
    });
    function convertHexString(bn) {
        if (!BN.isBN(bn)) {
            throw "an argument type should be  BN";
        }
        return "0".repeat(64 - bn.toString("hex").length) + bn.toString("hex");
    }
});
