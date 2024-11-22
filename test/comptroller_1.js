
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");



describe("Comptroller_1", () => {

    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance;
    let signer;

    beforeEach(async function () {
        [signer] = await ethers.getSigners();
        const { comptroller, vTokenInstanceUSDT, vTokenInstanceUSDC, vTokenInstanceBTC, vai, vaiInstance } = await deployVai();
        Comptroller = comptroller;
        vUSDT = vTokenInstanceUSDT;
        vUSDC = vTokenInstanceUSDC;
        vBTC = vTokenInstanceBTC;
        VAI = vai;
        VaiInstance = vaiInstance;
        USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
        USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());
        WBTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    });

    it("check vBTC/WBTC name and symbol", async () => {
        let vBTCName = await vBTC.name();
        let vBTCSymbol = await vBTC.symbol();
        let vBTCDecimals = await vBTC.decimals();
        chai.expect(vBTCName).to.be.equal("vBTC");
        chai.expect(vBTCSymbol).to.be.equal("vBTC");
        chai.expect(vBTCDecimals).to.be.equal(18);

        let WBTCName = await WBTC.name();
        let WBTCSymbol = await WBTC.symbol();
        let WBTCDecimals = await WBTC.decimals();
        chai.expect(WBTCName).to.be.equal("WBTC");
        chai.expect(WBTCSymbol).to.be.equal("WBTC");
        chai.expect(WBTCDecimals).to.be.equal(18);

        let underlying = await vBTC.underlying();
        chai.expect(underlying).to.be.equal(await WBTC.getAddress());
    });


    it("check Mint vBTC", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);
        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(WBTCBalance);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(0);
    });


    it("check Redeem vBTC", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        let half = WBTCBalance / 2n;
        await vBTC.mint(half);
        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(half);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half);

        let redeemAmount = half / 2n;
        await vBTC.redeem(redeemAmount);
        let vBTCBalance2 = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance2).to.be.equal(half - redeemAmount);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half + redeemAmount);
    });

    it("check initial price", async () => {
        let allMarkets = await Comptroller.getAllMarkets();
        const prices = [BigInt(10) ** BigInt(18), BigInt(10) ** BigInt(18), BigInt(97000) * BigInt(10) ** BigInt(18)];

        let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());

        for (let i = 0; i < allMarkets.length; i++) {
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            chai.expect(price).to.be.equal(prices[i]);
        }
    });

    it("list markets with no supply", async () => {
        let allMarkets = await Comptroller.getAllMarkets();  //列出所有市場

        let assets = new Array(allMarkets.length);
        let symbols = new Array(allMarkets.length);
        let totalSupply = BigInt(0);
        for (let i = 0; i < allMarkets.length; i++) {
            let vToken = await ethers.getContractAt("BEP20Harness", allMarkets[i]);
            let vTotalSupply = await vToken.totalSupply();

            vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
            let cashAmount = await vToken.getCash();
            let borrowAmount = await vToken.totalBorrows();
            let exchangeRate = await vToken.exchangeRateStored();
            let reserveAmount = await vToken.totalReserves();

            let underlying = await vToken.underlying();
            let token = await ethers.getContractAt("BEP20Harness", underlying);
            let symbol = await token.symbol();

            chai.expect(vTotalSupply).to.be.equal(0);
            chai.expect(exchangeRate).to.be.equal(BigInt(10) ** BigInt(18));
            chai.expect(cashAmount).to.be.equal(0);
            chai.expect(borrowAmount).to.be.equal(0);
            chai.expect(reserveAmount).to.be.equal(0);
            chai.expect(vTotalSupply * exchangeRate).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

            let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            console.log("price", price);
            assets[i] = vTotalSupply * exchangeRate * price;
            symbols[i] = symbol;

        }

        for (let i = 0; i < allMarkets.length; i++) {
            console.log(symbols[i], assets[i]);
            totalSupply += assets[i];
        }

        console.log("totalSupply", totalSupply);
    });



    it("list markets with supply", async () => {
        let allMarkets = await Comptroller.getAllMarkets();  //列出所有市場

        let assets = new Array(allMarkets.length);
        let symbols = new Array(allMarkets.length);
        let totalSupply = BigInt(0);
        for (let i = 0; i < allMarkets.length; i++) {
            let vToken = await ethers.getContractAt("BEP20Harness", allMarkets[i]);
            let vTotalSupply = await vToken.totalSupply();

            vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
            let cashAmount = await vToken.getCash();
            let borrowAmount = await vToken.totalBorrows();
            let exchangeRate = await vToken.exchangeRateStored();
            let reserveAmount = await vToken.totalReserves();
            let underlying = await vToken.underlying();
            let token = await ethers.getContractAt("BEP20Harness", underlying);
            let symbol = await token.symbol();
            chai.expect(vTotalSupply * exchangeRate).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
            assets[i] = vTotalSupply * exchangeRate;
            symbols[i] = symbol;
        }

        for (let i = 0; i < allMarkets.length; i++) {
            console.log(symbols[i], assets[i]);
            totalSupply += assets[i];
        }

        console.log("totalSupply", totalSupply);
    });




    it("total minted VAI", async () => {
        let totalSupply = await VAI.totalSupply();
        console.log("vai totalSupply", totalSupply);
    });


    it("VAI balance", async () => {
        let vaiAmount = await VAI.balanceOf(signer.address);
        console.log("vaiAmount", vaiAmount);
    });


    it("mint VAI", async () => {
        await Comptroller.enterMarkets([await vBTC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);

        let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail

        let half = mintableAmount / 2n;
        await VaiInstance.mintVAI(half);

        let VAIbalance = await VAI.balanceOf(signer.address);
        chai.expect(VAIbalance).to.be.equal(half);

        let [, remainedMintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(remainedMintableAmount).to.be.equal(half);

        let quarter = half / 2n;
        await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
        await VaiInstance.repayVAI(quarter);
        VAIbalance = await VAI.balanceOf(signer.address);
        chai.expect(VAIbalance).to.be.equal(quarter);
    });

    it("account status", async () => {
        let allMarkets = await Comptroller.getAllMarkets();

        await Comptroller.enterMarkets([await vBTC.getAddress()]);
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);

        let [, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        let half = mintableAmount / 2n;
        await VaiInstance.mintVAI(half);

        let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());

        //用户资产详情
        let assets = new Array(allMarkets.length);
        let symbols = new Array(allMarkets.length);
        let totalAsset = BigInt(0);
        for (let i = 0; i < allMarkets.length; i++) {
            let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
            let underlying = await vToken.underlying();
            let token = await ethers.getContractAt("BEP20Harness", underlying);
            let symbol = await token.symbol();
            let balance = await token.balanceOf(signer.address);
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            assets[i] = balance * price;
            symbols[i] = symbol;
            totalAsset += assets[i];
            console.log(symbols[i], assets[i]);
        }
        let membership = new Array(allMarkets.length);

        for (let i = 0; i < allMarkets.length; i++) {
            membership[i] = false;
        }

        let markets = await Comptroller.getAssetsIn(signer.address);
        for (let i = 0; i < allMarkets.length; i++) {
            for (let j = 0; j < markets.length; j++) {
                if (allMarkets[i] == markets[j]) {
                    membership[i] = true;
                }
            }
        }
        console.log("membership", membership);

        //用户借出的VAI 
        let VAIbalance = await VAI.balanceOf(signer.address);
        chai.expect(VAIbalance).to.be.equal(half);

        let [, remainedMintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(remainedMintableAmount).to.be.equal(half);

        let borrowLimitedUsed = VAIbalance * BigInt(100) / (VAIbalance + remainedMintableAmount);
        chai.expect(borrowLimitedUsed).to.be.equal(50);
    });

    it("enter and exits markets", async () => {
        await Comptroller.enterMarkets([await vUSDC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress()]);
        await Comptroller.exitMarket(await vUSDC.getAddress());
    });

    /*
      let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);

        await Comptroller.exitMarket(await vBTC.getAddress());

        let markets1 = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets1).to.be.deep.equal([]);
    */
})