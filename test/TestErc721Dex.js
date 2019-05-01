var MyToken721 = artifacts.require("./MyToken721.sol");
var MyToken20 = artifacts.require("./MyToken20.sol");
var moldex = artifacts.require("./Moldex721.sol");
var bigInt = require('../node_modules/big-integer');
var BN = require('bn.js');

contract('SampleContract And Dex', function (accounts) {
    const NFTBase = "0000000000000000000000000000000000000000000000000000000000000001"; // 128 bit 10000...001
    const NFTBaseBN = new BN(NFTBase);
    const NFTBigInt = bigInt(NFTBase);
    const coinBase = accounts[0];
    const subAccount = accounts[1];
    const privateKeys = [
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", // key of accounts[0]
        "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f", // key of accounts[1]
    ];

    it("[1] should generate ERC721 token", async function() {
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

    it("[2] should generate ERC20 token", async function() {
        const token = await MyToken20.deployed();
        const amount = await token.balanceOf(coinBase);
			  const initialSupply = await token.totalSupply();
        const name = await token.name();
        const symbol = await token.symbol();
        assert.equal(amount, 1000);
        assert.equal(initialSupply, 1000);
        assert.equal(name, "MyToken20");
        assert.equal(symbol, "MTKN20");
    });

    it("[3] should send ERC721 token. Test minting and sending.", async function () {
        // instances
        const token = await MyToken721.deployed();
				await token.mint(); //tokenId 2

        // Token Type
        const nonFungibleTokenBase = NFTBigInt.plus(NFTBigInt.times(1));
        const mintedTokenId = nonFungibleTokenBase.toString();

      // mint new ERC721 token tokenId 2
        // check symbol is correct
        const symbol = await token.symbol();
        assert.equal("MTKN", symbol);
        // check token owner is correct
        const tokenOwner = await token.ownerOf(mintedTokenId);
        assert.equal(coinBase, tokenOwner);
        // transfer ERC721 token from coinBase to subAccount
        await token.transferFrom(coinBase, subAccount, mintedTokenId);
        // check token is correctly sent
        const balance_after_receive = await token.balanceOf(subAccount);
        assert.equal(1, balance_after_receive)
        // check token owner 
        const mintedTokenOwner = await token.ownerOf(mintedTokenId);
        assert.equal(subAccount, mintedTokenOwner);
    });

    it("[4] should approve ERC721 token.", async function () {
        // instances
        const token = await MyToken721.deployed();

        await token.approve(subAccount, 0);
        const operator = await token.getApproved(0);
        assert.equal(subAccount, operator)
    });

    it("[5] ERC20 token can be deposited to Dex contract", async function () {
        // instances
        const moldexInstance = await moldex.deployed();
			  const token = await MyToken20.deployed();

        // check feeAccount and adminAcount
        const feeAccount = await moldexInstance.feeAccount();
        assert.equal(coinBase, feeAccount);
        const isAdmin = await moldexInstance.admins(coinBase);
        assert.equal(true, isAdmin);

			  await token.approve(moldexInstance.address, 10);
        await moldexInstance.deposit20(token.address, 10);
        const deposit = await moldexInstance.Assets(token.address,0,coinBase);
        assert.equal(10, deposit)
        const afterBalance = await token.balanceOf(moldexInstance.address);
        assert.equal(10, afterBalance);
    });

    it("[6] ERC20 token can be withdrawed from Dex contract", async function() {
        // instances
        const moldexInstance = await moldex.deployed();
        const token = await MyToken20.deployed();

        // withdraw ERC20 token
        await moldexInstance.withdraw20(token.address, 10);

			  // check balance of ERC20 token
        const afterBalance = await token.balanceOf(coinBase);
        assert.equal(1000, afterBalance);

        // check deposit amount
        const deposit = await moldexInstance.Assets(token.address, 0, coinBase);
        assert.equal(0, deposit, "deposit should be 0")
    });

    it("[7] ERC721 token can be deposited to Dex contract", async function () {
        // instances
        const moldexInstance = await moldex.deployed();
			  const token = await MyToken721.deployed();

        // check feeAccount and adminAcount
        const feeAccount = await moldexInstance.feeAccount();
        assert.equal(coinBase, feeAccount);
        const isAdmin = await moldexInstance.admins(coinBase);
        assert.equal(true, isAdmin);

			  await token.approve(moldexInstance.address, 1);
        await moldexInstance.deposit721(token.address, 1);
        const deposit = await moldexInstance.Assets(token.address,1,coinBase);
        assert.equal(1, deposit)
        const mintedTokenOwner = await token.ownerOf(1);
        assert.equal(moldexInstance.address, mintedTokenOwner);
    });

    it("[8] ERC721 token can be withdrawed from Dex contract", async function() {
        // instances
        const moldexInstance = await moldex.deployed();
        const token = await MyToken721.deployed();

			  // check owner of tokenId 1
        const previousOwner = await token.ownerOf(1);
        assert.equal(moldexInstance.address, previousOwner);

        // withdraw ERC721 token
        await moldexInstance.withdraw721(token.address, 1);

			//check owner of tokenId 1
        const currentOwner = await token.ownerOf(1);
        assert.equal(coinBase, currentOwner);

        // check deposit amount
        const deposit = await moldexInstance.Assets(token.address, 1, coinBase);
        assert.equal(0, deposit, "deposit should be 0")
    });

    it("[9] ETH can be deposited to Dex contract", async function() {
        const moldexInstance = await moldex.deployed();
        const ethSend = web3.toWei(0.1, "ether");
        await web3.eth.sendTransaction({ to: moldexInstance.address, from: subAccount, value: ethSend });

        const ethDeposit = await moldexInstance.Assets(0, 0, subAccount);
        assert.equal(ethSend, ethDeposit)
    });

    it("[10] ETH can withdraw from Dex contract", async function() {
        const moldexInstance = await moldex.deployed();
        const account = accounts[1];
        const ethWithdraw = web3.toWei(0.1, "ether");
        const beforeBalance = await moldexInstance.Assets(0, 0, account);
        // should deposit 0.1 ether
        assert.equal( ethWithdraw, beforeBalance);
        // withdraw eth as accounts[1]
        await moldexInstance.withdrawETH(100, { from: account });
        const afterBalance = await moldexInstance.Assets(0, 0, account);
        assert.equal(true, beforeBalance < afterBalance)
    });

    it("[7] ERC721 token can be deposited to Dex contract from subaccount", async function () {
        // instances
        const moldexInstance = await moldex.deployed();
			  const token = await MyToken721.deployed();

			  await token.approve(moldexInstance.address, 2, { from: subAccount });
        await moldexInstance.deposit721(token.address, 2, { from: subAccount });
        const deposit = await moldexInstance.Assets(token.address,2,subAccount);
        assert.equal(1, deposit)
        const mintedTokenOwner = await token.ownerOf(2);
        assert.equal(moldexInstance.address, mintedTokenOwner);
    });

    it("[5] ERC20 token can be deposited to Dex contract", async function () {
        // instances
        const moldexInstance = await moldex.deployed();
			  const token = await MyToken20.deployed();

			  await token.approve(moldexInstance.address, 100);
        await moldexInstance.deposit20(token.address, 100);
        const deposit = await moldexInstance.Assets(token.address,0,coinBase);
        assert.equal(100, deposit)
        const afterBalance = await token.balanceOf(moldexInstance.address);
        assert.equal(100, afterBalance);
    });

    it("[11] should exchange tokenId 2(ERC721) and ERC20 token using dex contract", async function() {
        /*
        account balances of deposits before exchange
                    ERC20 ERC721(tokenId 2)
        coinBase:   100      0
        subAccount: 0        1

        account balances of deposits before exchange
                    ERC20 ERC721(tokenId 2)
        coinBase:   50       1
        subAccount: 50       0

				maker:subAccount
				taker:coinBase
        * */

        // Instances
        const moldexInstance = await moldex.deployed();
			  const ERC20 = await MyToken20.deployed();
			  const ERC721 = await MyToken721.deployed();

        // tokenIds
        const buyTokenIdBN = new BN("0");
        const sellTokenIdBN = new BN("2");
        const buyTokenIdPaddedHexString = convertHexString(buyTokenIdBN);
        const sellTokenIdPaddedHexString = convertHexString(sellTokenIdBN);

        /*
        1 ERC721 with 50 token of ERC20
        coinBase buy 1 ERC721 token using 50 tokens of ERC20
        * */

        const buyAmountBN = new BN("50");
        const sellAmountBN = new BN("1");
        const expiryBN = new BN("10000");
        const makerNonceBN = new BN("10");
        const amountBN = new BN("50");
        const takerNonceBN = new BN("10");
        const feeMakeBN = new BN("0");
        // const feeTakeBN = new BN("0");

        // hex string
        const buyAmountPaddedHexString = convertHexString(buyAmountBN);
        const sellAmountPaddedHexString = convertHexString(sellAmountBN);
        const expiryPaddedHexString = convertHexString(expiryBN);
        const makerNoncePaddedHexString = convertHexString(makerNonceBN);
        const amountPaddedHexString = convertHexString(amountBN);
        const takerNoncePaddedHexString = convertHexString(takerNonceBN);
        const feeMakePaddedHexString = convertHexString(feeMakeBN);
        // const feeTakePaddedHexString = convertHexString(feeTakeBN);

        const orderHashBase =
            moldexInstance.address + ERC20.address.slice(2,42) +
            buyTokenIdPaddedHexString + buyAmountPaddedHexString +
            ERC721.address.slice(2,42) + sellTokenIdPaddedHexString +
            sellAmountPaddedHexString + expiryPaddedHexString +
            makerNoncePaddedHexString + subAccount.slice(2,42);
        // sign order hash
        const orderHash = web3.sha3(orderHashBase, { encoding: 'hex' });
        const orderHashSign = web3.eth.sign(subAccount, orderHash);
        const r1 = orderHashSign.slice(0,66);
        const s1 = "0x" + orderHashSign.slice(66, 130);
        let v_base1 = new BN(Number(orderHashSign.slice(130, 132)) + 27);
        const v1 = v_base1.toString(10);

        // create tradeHash
        const tradeHashBase =
            orderHash + amountPaddedHexString +
            coinBase.slice(2,42) + takerNoncePaddedHexString;
        const tradeHash = web3.sha3(tradeHashBase, { encoding: 'hex' });
        const tradeHashSign = web3.eth.sign(coinBase, tradeHash);
        const r2 = tradeHashSign.slice(0,66);
        const s2 = "0x" + tradeHashSign.slice(66,130);
        const v_base2 = new BN(Number(tradeHashSign.slice(130,132)) + 27);
        const v2 = v_base2.toString(10);

        /*
        tradeValues[0] buyAmount
        tradeValues[1] sellAmount     amountBuyとamountSellは amountBuy / amountSellでレートを表す
        tradeValues[2] expiry
        tradeValues[3] order nonce
        tradeValues[4] amount // これは このトレードで交換されるBuyTokenの実際の量
        tradeValues[5] trade nonce
        tradeValues[6] feeMake
        // tradeValues[7] feeTake
        tradeValues[8] buy token の Id
        tradeValues[9] sell token の Id
        */

        const tradeValues = [
            buyAmountBN.toString(10),
            sellAmountBN.toString(10),
            expiryBN.toString(10),
            makerNonceBN.toString(10),
            amountBN.toString(10),
            takerNonceBN.toString(10),
            feeMakeBN.toString(10),
            // feeTakeBN.toString(10),
            buyTokenIdBN.toString(10),
            sellTokenIdBN.toString(10)
        ];

        const tradeAddresses = [
            ERC20.address,
            ERC721.address,
            coinBase,
            subAccount
        ];

        const v = [
            v1,
            v2
        ];

        const rs = [
            r1,
            s1,
            r2,
            s2
        ];
			console.log("ok!")
        // create trade transaction
        await moldexInstance.trade721(tradeValues, tradeAddresses, v, rs);

        const depositAfterExchange = await moldexInstance.Assets(ERC20.address, buyTokenIdBN.toString(10), coinBase);
        const depositAfterExchangeSub = await moldexInstance.Assets(ERC20.address, buyTokenIdBN.toString(10), subAccount);
        const depositAfterExchangeSell = await moldexInstance.Assets(ERC721.address, sellTokenIdBN.toString(10), coinBase);
        const depositAfterExchangeSellSub = await moldexInstance.Assets(ERC721.address, sellTokenIdBN.toString(10), subAccount);

        // assert buy tokens
        assert.equal(50, depositAfterExchange); // 100 - 50 = 50 coinBase bought 1 ERC721
        assert.equal(50, depositAfterExchangeSub); // 0 + 50 = 50 subAccount sell 1 ERC721

        // assert sell tokens
        assert.equal(1, depositAfterExchangeSell); // 0 + 1 = 1 coinBase sell 50 ERC20
        assert.equal(0, depositAfterExchangeSellSub); // 1 - 0 = 0 subAccount buy 50 ERC20
    });

    /*=========== Functions ==========*/

    function convertHexString(bn) {
        if(!BN.isBN(bn)) { throw "an argument type should be  BN"}
        return "0".repeat(64 - bn.toString("hex").length) + bn.toString('hex');
    }

});
