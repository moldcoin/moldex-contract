var SampleContract = artifacts.require("./SampleToken.sol");
var Moldex = artifacts.require("./Moldex.sol");
var BN = require('bn.js');


contract('TestSampleToken', function (accounts) {
    const fungibleTokenBase = "340282366920938463463374607431768211456"; // 129 bit 10000...000
    const fungibleBaseBN = new BN(fungibleTokenBase);
    const two = new BN("2");
    const coinBase = accounts[0];
    const subAccount = accounts[1];
    it('[SampleToken(1)] TestMintTokens', async function () {
        const token = await SampleContract.deployed();
        await token.mint("Fungible Token 1", 1000000, "http://sample.fungible.com", 2, "FT1", false);
        await token.mint("Fungible Token 2", 1000000, "http://sample.fungible.com", 2, "FT2", false);

        const symbol1 = await token.symbol(fungibleTokenBase);
        const id2 = fungibleBaseBN.mul(two);
        const symbol2 = await token.symbol(id2.toString());

        assert.equal('FT1', symbol1);
        assert.equal('FT2', symbol2)

    });

    // 2種類のfungible tokenをdeposit, withdrawする
    it('should deposit and withdraw 2 tokens', async function() {
        const token = await SampleContract.deployed();
        const dex = await Moldex.deployed();
        const tokenId_1 = fungibleTokenBase;
        const tokenId_2_BN = fungibleBaseBN.mul(two);
        const tokenId_2 = tokenId_2_BN.toString(10);

        // deposit
        await dex.deposit([token.address, token.address],[tokenId_1, tokenId_2],[1000,1000]);

        const deposit_1 = await dex.ERC1155Tokens(token.address, tokenId_1, coinBase);
        const deposit_2 = await dex.ERC1155Tokens(token.address, tokenId_2, coinBase);

        assert.equal(1000, deposit_1, "deposit 1 should be 1000");
        assert.equal(1000, deposit_2, "deposit 2 should be 1000");

        //以下withdraw

        await dex.withdraw([token.address,token.address],[tokenId_1, tokenId_2],[500, 500]);

        const deposit_1_after = await dex.ERC1155Tokens(token.address, tokenId_1, coinBase);
        const deposit_2_after = await dex.ERC1155Tokens(token.address, tokenId_2, coinBase);

        assert.equal(500, deposit_1_after, "deposit 1 should decrease to 500");
        assert.equal(500, deposit_2_after, "deposit 2 should decrease to 500")
    })


});
