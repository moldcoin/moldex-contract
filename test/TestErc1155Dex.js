var SampleContract = artifacts.require("./SampleToken.sol");
var moldex = artifacts.require("./Moldex.sol");
var bigInt = require('../node_modules/big-integer');
var BN = require('bn.js');

contract('SampleContract And Dex', function (accounts) {
    const fungibleTokenBase = "340282366920938463463374607431768211456"; // 129 bit 10000...000
    const nonFungibleTokenBase = "57896044618658097711785492504343953926634992332820282019728792003956564819968"; // non fungible token base 256bit 1000..00
    const fungibleBigInt = bigInt(fungibleTokenBase);
    const fungibleBaseBN = new BN(fungibleTokenBase);
    const nonFungibleBaseBN = new BN(nonFungibleTokenBase);
    const nonFungibleBigInt = bigInt(nonFungibleTokenBase);
    const coinBase = accounts[0];
    const subAccount = accounts[1];
    const privateKeys = [
        "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", // key of accounts[0]
        "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f", // key of accounts[1]
    ];

    it("[1] should generate sample fungible token whose total supply is 1000000, decimal 2 and generate non-fungible token", async function() {
        const instance = await SampleContract.deployed();
        await instance.mint("Fungible Token 1", 1000000, "http://sample.fungible.com", 2, "FT", false);
        await instance.mint("Non Fungible Token", 0, "http://sample.fungible.com", 0, "NFT", true);
        const totalSupplyFungible = await instance.totalSupply(fungibleTokenBase);
        const nf_token_id = nonFungibleBigInt.plus(fungibleBigInt.times(2));
        const totalSupplyNonFungible = await instance.totalSupply(nf_token_id.toString());
        const isNonFungible = await instance.isNonFungible(nf_token_id.toString());
        assert.equal(true, isNonFungible);
        assert.equal(totalSupplyFungible.toNumber(), 1000000);
        assert.equal(totalSupplyNonFungible.toNumber(), 0);
    });

    it("[2] should send fungible token ", async function () {
        // Instances
        const instance = await SampleContract.deployed();
        const balance = await instance.balanceOf(fungibleTokenBase, coinBase);
        assert.equal(balance, 1000000, "should equal to 1000000");
        /*
        Send 1000 FungibleToken to subAccount
        * */
        await instance.transfer(subAccount, [fungibleTokenBase], [1000]);
        const balance_after_send =  await instance.balanceOf(fungibleTokenBase, coinBase);
        assert.equal(1000000 - 1000, balance_after_send, "should equal to 1000000 - 1000");

        //check balance of sub account
        const balanceOfSubAccount = await instance.balanceOf(fungibleTokenBase, subAccount);
        assert.equal(1000, balanceOfSubAccount)
    });

    it("[3] should send non-fungible token. Test minting and sending.", async function () {
        // Instances
        const instance = await SampleContract.deployed();

        // Token Type
        const nonFungibleTokenBase = nonFungibleBigInt.plus(fungibleBigInt.times(3));
        const nonFungibleTokenType = nonFungibleTokenBase.toString();

        // mint new non-fungible token tokenId 3
        await instance.mint("NonFungibleToken", 0, "https://fuckyou.com", 0, "NFT", true);

        // mint token
        await instance.mintNonFungible(nonFungibleTokenType, [coinBase]);
        const mintedTokenId = nonFungibleTokenBase.toString();

        // check symbol is correct
        const symbol = await instance.symbol(nonFungibleTokenType);
        assert.equal("NFT", symbol);

        // check token owner is correct
        const tokenOwner = await instance.ownerOf(mintedTokenId);
        assert.equal(coinBase, tokenOwner);

        // check token balance is correct
        const balance = await instance.balanceOf(nonFungibleTokenType, coinBase);
        assert.equal(1, balance);

        // transfer non-fungible token from coinBase to subAccount
        await instance.transfer(subAccount, [mintedTokenId], [1]);

        // check token is correctly sent
        const balance_after_send = await instance.balanceOf(nonFungibleTokenType, coinBase);
        const balance_after_receive = await instance.balanceOf(nonFungibleTokenType, subAccount);
        const mintedTokenOwner = await instance.ownerOf(mintedTokenId);
        assert.equal(subAccount, mintedTokenOwner);
        assert.equal(0, balance_after_send);
        assert.equal(1, balance_after_receive)
    });

    it("[4] should approve fungible token.", async function () {
        const instance = await SampleContract.deployed();
        const approval = await instance.allowance(fungibleTokenBase, coinBase, accounts[1]);
        await instance.approve(accounts[1], [fungibleTokenBase], [0], [100]);
        const approval_after_approve = await instance.allowance(fungibleTokenBase, coinBase, accounts[1]);
        assert.equal(100, approval_after_approve);
    });

    it("[5] should mint and approve non-fungible token.", async function () {
        // Instances
        const instance = await SampleContract.deployed();
        const nonFungibleBase = nonFungibleBigInt.plus(fungibleBigInt.times(3));
        const nonFungibleTokenType = nonFungibleBase.toString();

        // mint non-fungible token
        await instance.mintNonFungible(nonFungibleTokenType, [coinBase]);
        const totalSupply = await instance.totalSupply(nonFungibleTokenType);
        const tokenId = nonFungibleBase.plus(1).toString();
        // total supply should equal to 2
        assert.equal(2, totalSupply);
        const balance = await instance.balanceOf(nonFungibleTokenType, accounts[0]);
        // balance of coinBase account should be 1
        assert.equal(1, balance);
        const tokenOwner = await instance.ownerOf(tokenId);
        assert.equal(accounts[0], tokenOwner, `token owner should be ${tokenOwner}`);
        await instance.approve(accounts[2], [tokenId], [0],[1]);
        const allowance = await instance.allowance(tokenId, accounts[0], accounts[2]);
        assert.equal(1, allowance, "allowance should be 1")
    });

    it("[6] coinBase has non-fungible token whose ID is 1", async function () {
        const instance = await SampleContract.deployed();
        const nonFungibleBase = nonFungibleBigInt.plus(fungibleBigInt.times(3));
        const nonFungibleType = nonFungibleBase.toString();
        const ids = await instance.nonFungibleOwnedTokens(coinBase, nonFungibleType);
        const expectedOwnedTokens = [1];
        for(let i = 0; i < ids.length; i++) {
            assert.equal(expectedOwnedTokens[i], ids[i])
        }
    });

    it("[7] token can be deposited ETH to Dex contract", async function () {
        // Instances
        const moldexInstance = await moldex.deployed();
        const token = await SampleContract.deployed();

        // check feeAccount and adminAcount
        const feeAccount = await moldexInstance.feeAccount();
        assert.equal(coinBase, feeAccount);
        const isAdmin = await moldexInstance.admins(coinBase);
        assert.equal(true, isAdmin);
        await moldexInstance.deposit([token.address], [fungibleTokenBase], [100]);

        const deposit = await moldexInstance.ERC1155Tokens(token.address,fungibleTokenBase,coinBase);
        assert.equal(100, deposit)
    });

    it("[8] ETH can be deposited to Dex contract", async function() {
        const moldexInstance = await moldex.deployed();
        const ethSend = web3.toWei(0.1, "ether");
        await web3.eth.sendTransaction({ to: moldexInstance.address, from: subAccount, value: ethSend });
        const ethDeposit = await moldexInstance.ERC1155Tokens(0, 0, subAccount);
        assert.equal(ethSend, ethDeposit)
    });

    it("[9] ETH can withdraw from Dex contract", async function() {
        const moldexInstance = await moldex.deployed();
        const account = accounts[1];
        const ethWithdraw = web3.toWei(0.1, "ether");
        const beforeBalance = await moldexInstance.ERC1155Tokens(0, 0, account);
        // should deposit 0.1 ether
        assert.equal( ethWithdraw, beforeBalance);
        // withdraw eth as accounts[1]
        await moldexInstance.withdraw([0], [0], [100], { from: account });
        const afterBalance = await moldexInstance.ERC1155Tokens(0, 0, account);
        assert.equal(true, beforeBalance < afterBalance)
    });

    it("[10] fungible-token can be deposited to Dex contract as subAccount", async function() {
        // instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();

        // check current balances
        const balanceBefore = await tokenInstance.balanceOf(fungibleTokenBase, subAccount);
        assert.equal(1000, balanceBefore, "subAccount should have 1000 token");

        // deposit fungible token
        await moldexInstance.deposit([tokenInstance.address], [fungibleTokenBase], [200], { from: subAccount });

        //check balance after deposit
        const balanceAfter = await tokenInstance.balanceOf(fungibleTokenBase, subAccount);
        assert.equal(800, balanceAfter, "token balance of subAccount should be 900 after deposit.");

        // check deposit
        const deposit = await moldexInstance.ERC1155Tokens( tokenInstance.address, fungibleTokenBase, subAccount);
        assert.equal(200, deposit, "deposit should be 200")
    });

    it("[11] sign message and can adminWithdraw ", async function() {
        // instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();
        /*
        RawMessage: (Dex Address)(Token Address)(TokenId)(Amount)(User Address)
        soliditySha3(RawMessage) を web3.eth.accounts.sign(data, privateKey)
       * */
        const fungibleBaseBN = new BN(fungibleTokenBase);
        const amountBN = new BN("100");
        const nonce = new BN("1");
        const paddedFungibleBaseHex = convertHexString(fungibleBaseBN);
        const paddedAmountHex = convertHexString(amountBN);
        const paddedNonce = convertHexString(nonce);
        const baseMessage = moldexInstance.address + tokenInstance.address.slice(2,42) + paddedFungibleBaseHex + paddedAmountHex + subAccount.slice(2,42) + paddedNonce;

        // encoding: hexをつけたらsolidityのsha3と同じになってうまくいった
        const hashMessage = web3.sha3(baseMessage, { encoding: 'hex' });

        const sign = web3.eth.sign(subAccount, hashMessage);
        const r = sign.slice(0,66);
        const s = "0x" + sign.slice(66, 130);
        let v_base = new BN(Number(sign.slice(130, 132)) + 27);

        // check balance before withdraw
        const deposit = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenBase, subAccount);
        assert.equal(200, deposit, "deposit should be 200");

        // send transaction from coinBase account
        const addresses = [tokenInstance.address, subAccount];
        // tokenId, value, fee, nonce
        const values = [fungibleTokenBase, 100, 0, 1];
        await moldexInstance.adminWithdrawERC1155(addresses, values, v_base.toString(10), r, s);
        const depositAfter = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenBase, subAccount);
        assert.equal(100, depositAfter, "deposit should decrease to 100");
    });

    it("[12] should deposit new fungible-token to dex contract", async function() {
        // Instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();

        const coinBaseBalanceBefore = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenBase, coinBase);
        const subAccountBalanceBefore = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenBase, subAccount);
        assert.equal(100, coinBaseBalanceBefore, "coinBase deposit should be 100 before exchange");
        assert.equal(100, subAccountBalanceBefore, "subAccount deposit should be 100 before exchange");

        // mint fungible token 2
        await tokenInstance.mint("Fungible Token 2", 1000000, "http://sample.fungible.com", 2, "FT2", false);
        const tokenTypeBase = fungibleBigInt.times(4);
        const tokenType = tokenTypeBase.toString();

        // balance Of coinBase
        const coinBaseBalanceNewToken = await tokenInstance.balanceOf(tokenType, coinBase);
        assert.equal(1000000, coinBaseBalanceNewToken);

        // deposit new token to contract
        await moldexInstance.deposit([tokenInstance.address], [tokenType], [200], { from: coinBase });
        const depositCoinBase = await moldexInstance.ERC1155Tokens(tokenInstance.address, tokenType, coinBase);
        assert.equal(200, depositCoinBase);
    });

    it("[13] should exchange token1 and token4 using dex contract", async function() {
        /*
        account balances of deposits before exchange
                    token1 token4
        coinBase:   100    200
        subAccount: 100      0

        account balances of deposits before exchange
                    token1 token4
        coinBase:   150     100
        subAccount: 50,     100
        * */

        // Instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();
        // tokenIds
        const buyTokenIdBN = new BN(fungibleTokenBase);
        const sellTokenIdBN = new BN(fungibleBigInt.times(4).toString());
        const buyTokenIdPaddedHexString = convertHexString(buyTokenIdBN);
        const sellTokenIdPaddedHexString = convertHexString(sellTokenIdBN);

        /*
        50 token of tokenF1 with 100 token of tokenF2
        coinBase buy 50 tokens of tokenF1 using 100 tokens of tokenF2
        * */

        const buyAmountBN = new BN("50");
        const sellAmountBN = new BN("100");
        const expiryBN = new BN("10000");
        const makerNonceBN = new BN("10");
        const amountBN = new BN("50");
        const takerNonceBN = new BN("10");
        const feeMakeBN = new BN("0");
        const feeTakeBN = new BN("0");

        // hex string
        const buyAmountPaddedHexString = convertHexString(buyAmountBN);
        const sellAmountPaddedHexString = convertHexString(sellAmountBN);
        const expiryPaddedHexString = convertHexString(expiryBN);
        const makerNoncePaddedHexString = convertHexString(makerNonceBN);
        const amountPaddedHexString = convertHexString(amountBN);
        const takerNoncePaddedHexString = convertHexString(takerNonceBN);
        const feeMakePaddedHexString = convertHexString(feeMakeBN);
        const feeTakePaddedHexString = convertHexString(feeTakeBN);

        const orderHashBase =
            moldexInstance.address + tokenInstance.address.slice(2,42) +
            buyTokenIdPaddedHexString + buyAmountPaddedHexString +
            tokenInstance.address.slice(2,42) + sellTokenIdPaddedHexString +
            sellAmountPaddedHexString + expiryPaddedHexString +
            makerNoncePaddedHexString + coinBase.slice(2,42);
        // sign order hash
        const orderHash = web3.sha3(orderHashBase, { encoding: 'hex' });
        const orderHashSign = web3.eth.sign(coinBase, orderHash);
        const r1 = orderHashSign.slice(0,66);
        const s1 = "0x" + orderHashSign.slice(66, 130);
        let v_base1 = new BN(Number(orderHashSign.slice(130, 132)) + 27);
        const v1 = v_base1.toString(10);

        // create tradeHash
        const tradeHashBase =
            orderHash + amountPaddedHexString +
            subAccount.slice(2,42) + takerNoncePaddedHexString;
        const tradeHash = web3.sha3(tradeHashBase, { encoding: 'hex' });
        const tradeHashSign = web3.eth.sign(subAccount, tradeHash);
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
        tradeValues[7] feeTake
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
            feeTakeBN.toString(10),
            buyTokenIdBN.toString(10),
            sellTokenIdBN.toString(10)
        ];

        const tradeAddresses = [
            tokenInstance.address,
            tokenInstance.address,
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
        // create trade transaction
        await moldexInstance.trade(tradeValues, tradeAddresses, v, rs);

        const depositAfterExchange = await moldexInstance.ERC1155Tokens(tokenInstance.address, buyTokenIdBN.toString(10), coinBase);
        const depositAfterExchangeSub = await moldexInstance.ERC1155Tokens(tokenInstance.address, buyTokenIdBN.toString(10), subAccount);
        const depositAfterExchangeSell = await moldexInstance.ERC1155Tokens(tokenInstance.address, sellTokenIdBN.toString(10), coinBase);
        const depositAfterExchangeSellSub = await moldexInstance.ERC1155Tokens(tokenInstance.address, sellTokenIdBN.toString(10), subAccount);

        // assert buy tokens
        assert.equal(150, depositAfterExchange); // 100 + 50 = 150 coinBase bought 50 FTN1
        assert.equal(50, depositAfterExchangeSub); // 100 - 50 = 50 subAccount sell 50 FTN1

        // assert sell tokens
        assert.equal(100, depositAfterExchangeSell); // 200 - 100 = 100 coinBase sell 100 FTN2
        assert.equal(100, depositAfterExchangeSellSub); // 0 + 100 = 100 subAccount buy 100 FTN2
    });


    // Deposit non-fungible token
    it("[14] should deposit non-fungible token to dex contract", async function () {
        // Instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();

        /*  tokenIds
            non-fungibleToken
        */
        const nonFungibleIdBase = nonFungibleBigInt.plus(fungibleBigInt.times(3));
        const nonFungibleTokenId = nonFungibleIdBase.toString();

        const balanceOfNonFungible = await tokenInstance.balanceOf(nonFungibleTokenId, coinBase);

        // balance should be 11
        assert.equal(1, balanceOfNonFungible);

        const ownedTokensOfCoinBase = await tokenInstance.nonFungibleOwnedTokens(coinBase, nonFungibleTokenId);
        const depositTokenIdBase = nonFungibleIdBase.plus(ownedTokensOfCoinBase[0].toString()); // index 1
        const depositTokenId = depositTokenIdBase.toString();

        // deposit fungible token
        await moldexInstance.deposit([tokenInstance.address], [depositTokenId], [1]);

        // check deposit
        const depositNFT = await moldexInstance.ERC1155Tokens(tokenInstance.address, depositTokenId, coinBase);
        assert.equal(1, depositNFT.toString());
    });

    it('[15] should exchange non-fungible to fungible token', async function () {
        /*          Deposit
                   Before exchange             After exchange
                   token3(NFT)  token4(FT)     token3(NFT)  token4(FT)
       coinBase    1             100           0               150
       subAccount  0             100           1               50
       * */

        // Instances
        const moldexInstance = await moldex.deployed();
        const tokenInstance = await SampleContract.deployed();

        /*  tokenIds
            non-fungibleToken
        */
        const three = new BN('3');
        const one = new BN('1');
        const nonFungibleIdBaseBN = nonFungibleBaseBN.add(fungibleBaseBN.mul(three)).add(one);
        const nonFungibleTokenId = nonFungibleIdBaseBN.toString(10);

        /*
            fungibleToken
        * */
        const four = new BN('4');
        const fungibleTokenIdBN = fungibleBaseBN.mul(four);
        const fungibleTokenId = fungibleTokenIdBN.toString(10);


        // order
        const buyAmountBN = new BN("50");
        const sellAmountBN = new BN("1");
        const expiryBN = new BN("10000");
        const makerNonceBN = new BN("11");
        // trade
        const amountBN = new BN("50");
        const takerNonceBN = new BN("11");
        const feeMakeBN = new BN("0");
        const feeTakeBN = new BN("0");

        // hex String
        const hexBuyAmount = convertHexString(buyAmountBN);
        const hexSellAmount = convertHexString(sellAmountBN);
        const hexExpiry = convertHexString(expiryBN);
        const hexMakerNonce = convertHexString(makerNonceBN);
        const hexAmount = convertHexString(amountBN);
        const hexTakerNonce = convertHexString(takerNonceBN);
        const hexBuyTokenId = convertHexString(fungibleTokenIdBN);
        const hexSellTokenId = convertHexString(nonFungibleIdBaseBN);


        // create orderHash
        const orderHashBase =
            moldexInstance.address + tokenInstance.address.slice(2,42) +
            hexBuyTokenId + hexBuyAmount +
            tokenInstance.address.slice(2,42) + hexSellTokenId +
            hexSellAmount + hexExpiry +
            hexMakerNonce + coinBase.slice(2,42);
        // sign order hash
        const orderHash = web3.sha3(orderHashBase, { encoding: 'hex' });
        const orderHashSign = web3.eth.sign(coinBase, orderHash);
        const r1 = orderHashSign.slice(0,66);
        const s1 = "0x" + orderHashSign.slice(66, 130);
        let v_base1 = new BN(Number(orderHashSign.slice(130, 132)) + 27);
        const v1 = v_base1.toString(10);

        // create tradeHash
        const tradeHashBase =
            orderHash + hexAmount +
            subAccount.slice(2,42) + hexTakerNonce;
        const tradeHash = web3.sha3(tradeHashBase, { encoding: 'hex' });
        const tradeHashSign = web3.eth.sign(subAccount, tradeHash);
        const r2 = tradeHashSign.slice(0,66);
        const s2 = "0x" + tradeHashSign.slice(66,130);
        const v_base2 = new BN(Number(tradeHashSign.slice(130,132)) + 27);
        const v2 = v_base2.toString(10);

        // trade args

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

        const tradeValues = [
            buyAmountBN.toString(10),
            sellAmountBN.toString(10),
            expiryBN.toString(10),
            makerNonceBN.toString(10),
            amountBN.toString(10),
            takerNonceBN.toString(10),
            feeMakeBN.toString(10),
            feeTakeBN.toString(10),
            fungibleTokenIdBN.toString(10),
            nonFungibleIdBaseBN.toString(10)
        ];

        const tradeAddresses = [
            tokenInstance.address,
            tokenInstance.address,
            coinBase,
            subAccount
        ];

        await moldexInstance.trade(tradeValues, tradeAddresses, v, rs);
        const depositAfterExchange = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenId, coinBase);
        const depositAfterExchangeSub = await moldexInstance.ERC1155Tokens(tokenInstance.address, fungibleTokenId, subAccount);
        const depositAfterExchangeSell = await moldexInstance.ERC1155Tokens(tokenInstance.address, nonFungibleTokenId, coinBase);
        const depositAfterExchangeSellSub = await moldexInstance.ERC1155Tokens(tokenInstance.address, nonFungibleTokenId, subAccount);


        assert.equal(150,depositAfterExchange); // coinBase FT 150
        assert.equal(50,depositAfterExchangeSub); // subAccount 50
        assert.equal(0, depositAfterExchangeSell); // coinBase NFT 0
        assert.equal(1, depositAfterExchangeSellSub); // coinBase NFT 1
    });
    /*=========== Functions ==========*/

    function convertHexString(bn) {
        if(!BN.isBN(bn)) { throw "an argument type should be  BN"}
        return "0".repeat(64 - bn.toString("hex").length) + bn.toString('hex');
    }

});
