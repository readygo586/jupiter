
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai} = require("../utils/deploy");



describe("Comptroller_1", () => {

    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance;
    let signer, account1, account2;
    const big18 = BigInt(10) ** BigInt(18);
    const big17 = BigInt(10) ** BigInt(17);

    beforeEach(async function () {
        [signer, account1, account2] = await ethers.getSigners();
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

    it("Check vBTC/WBTC name and symbol", async () => {
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


    it("Check initial price", async () => {
        let allMarkets = await Comptroller.getAllMarkets();
        const prices = [BigInt(10) ** BigInt(18), BigInt(10) ** BigInt(18), BigInt(97000) * BigInt(10) ** BigInt(18)];

        let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());

        for (let i = 0; i < allMarkets.length; i++) {
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            chai.expect(price).to.be.equal(prices[i]);
        }
    });


    it("Check initial collateral factor", async () => {
        let allMarkets = await Comptroller.getAllMarkets();
    
        const collateralFactor = [big17 * 8n, big17 * 8n, big17 * 7n];
        for (let i = 0; i < allMarkets.length; i++) {
            [, collateralFactorMantissa,  ] = await Comptroller.markets(allMarkets[i]);
            chai.expect(collateralFactorMantissa).to.be.equal(collateralFactor[i]);
        }
    });

    
    it ("Check initial borrow cap", async () => {
        let allMarkets = await Comptroller.getAllMarkets();
    
        for (let i = 0; i < allMarkets.length; i++) {
            let cap = await Comptroller.borrowCaps(allMarkets[i]);
            chai.expect(cap).to.be.equal(0n);
        }
    });

    it ("Check VAI repay rate", async () => {
        let repayRateYearly = await VaiInstance.getVAIRepayRate();
        chai.expect(repayRateYearly).to.be.equal(0);

        repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
        chai.expect(repayRatePerBlock).to.be.equal(0);
    });


    it("Mint vBTC success and tranfer vBTC success", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);
        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(WBTCBalance);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(0);

        let vTotalSupply = await vBTC.totalSupply();
        let cashAmount = await vBTC.getCash();
        let borrowAmount = await vBTC.totalBorrows();
        let exchangeRate = await vBTC.exchangeRateStored();
        let reserveAmount = await vBTC.totalReserves();
        chai.expect(vTotalSupply).to.be.equal(WBTCBalance);
        chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
        chai.expect(cashAmount).to.be.equal(WBTCBalance);
        chai.expect(borrowAmount).to.be.equal(0);
        chai.expect(reserveAmount).to.be.equal(0);
        chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);

        await vBTC.transfer(account1.address, big18);
        await vBTC.transfer(account2.address, BigInt(2)*big18);

        let vBTCBalance1 = await vBTC.balanceOf(account1.address);
        let vBTCBalance2 = await vBTC.balanceOf(account2.address);
        vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance1).to.be.equal(big18);
        chai.expect(vBTCBalance2).to.be.equal(BigInt(2)*big18);
        chai.expect(vBTCBalance).to.be.equal(WBTCBalance - big18 - BigInt(2)*big18);
    });

    it("Mint vBTC fail beacause of insufficient balance ", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await chai.expect(
            vBTC.mint(WBTCBalance + big18)
        ).to.be.revertedWith("Insufficient balance"); 

        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(0);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(WBTCBalance);

        let vTotalSupply = await vBTC.totalSupply();
        let cashAmount = await vBTC.getCash();
        let borrowAmount = await vBTC.totalBorrows();
        let exchangeRate = await vBTC.exchangeRateStored();
        let reserveAmount = await vBTC.totalReserves();
        chai.expect(vTotalSupply).to.be.equal(0);
        chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
        chai.expect(cashAmount).to.be.equal(0);
        chai.expect(borrowAmount).to.be.equal(0);
        chai.expect(reserveAmount).to.be.equal(0);
        chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    });

    it("Mint vBTC fail beacause of not approve ", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await chai.expect(
            vBTC.mint(big18)
        ).to.be.revertedWith("Insufficient allowance"); 

        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(0);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(WBTCBalance);

        let vTotalSupply = await vBTC.totalSupply();
        let cashAmount = await vBTC.getCash();
        let borrowAmount = await vBTC.totalBorrows();
        let exchangeRate = await vBTC.exchangeRateStored();
        let reserveAmount = await vBTC.totalReserves();
        chai.expect(vTotalSupply).to.be.equal(0);
        chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
        chai.expect(cashAmount).to.be.equal(0);
        chai.expect(borrowAmount).to.be.equal(0);
        chai.expect(reserveAmount).to.be.equal(0);
        chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    });


    // initially, signer has 100 BTC
    it("transfer BTC then Mint vBTC Success", async () => {
        await WBTC.transfer(account1.address, BigInt(1)*big18);
        let WBTCBalance1 = await WBTC.balanceOf(account1.address);
        chai.expect(WBTCBalance1).to.be.equal(BigInt(1)*big18);
        
        await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.connect(account1).mint(WBTCBalance1);
        let vBTCBalance1 = await vBTC.balanceOf(account1.address);
        chai.expect(vBTCBalance1).to.be.equal(WBTCBalance1);
        chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);


        await WBTC.transfer(account2.address, BigInt(2)*big18);
        let WBTCBalance2 = await WBTC.balanceOf(account2.address);
        chai.expect(WBTCBalance2).to.be.equal(BigInt(2)*big18);

        await WBTC.connect(account2).approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.connect(account2).mint(WBTCBalance2);
        let vBTCBalance2 = await vBTC.balanceOf(account2.address);
        chai.expect(vBTCBalance2).to.be.equal(WBTCBalance2);
        chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);


        let WBTCBalance = await WBTC.balanceOf(signer.address);
        chai.expect(WBTCBalance).to.be.equal(BigInt(97)*big18);


        let vTotalSupply = await vBTC.totalSupply();
        let cashAmount = await vBTC.getCash();
        let borrowAmount = await vBTC.totalBorrows();
        let exchangeRate = await vBTC.exchangeRateStored();
        let reserveAmount = await vBTC.totalReserves();
        chai.expect(vTotalSupply).to.be.equal(WBTCBalance1 + WBTCBalance2);
        chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
        chai.expect(cashAmount).to.be.equal(WBTCBalance1+WBTCBalance2);
        chai.expect(borrowAmount).to.be.equal(0);
        chai.expect(reserveAmount).to.be.equal(0);
        chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    });


    it("Redeem vBTC success", async () => {
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

    it("Transfer vBTC and Redeem vBTC by other success", async () => {
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        let half = WBTCBalance / 2n;
        await vBTC.mint(half);
        let vBTCBalance = await vBTC.balanceOf(signer);
        chai.expect(vBTCBalance).to.be.equal(half);
        chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half);

        await vBTC.transfer(account1.address, half);
        let vBTCBalance1 = await vBTC.balanceOf(account1.address);
        chai.expect(vBTCBalance1).to.be.equal(half);
        chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);
        chai.expect(await vBTC.balanceOf(signer)).to.be.equal(0);

        await vBTC.connect(account1).redeem(half);
        chai.expect(await vBTC.balanceOf(account1.address)).to.be.equal(0);
        chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(half);
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
            chai.expect(exchangeRate).to.be.equal(big18);
            chai.expect(cashAmount).to.be.equal(0);
            chai.expect(borrowAmount).to.be.equal(0);
            chai.expect(reserveAmount).to.be.equal(0);
            chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

            let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            // console.log("price", price);
            assets[i] = vTotalSupply * exchangeRate * price;
            symbols[i] = symbol;
        }

        for (let i = 0; i < allMarkets.length; i++) {
            // console.log(symbols[i], assets[i]);
            totalSupply += assets[i];
        }

        chai.expect(totalSupply).to.be.equal(0);
        // console.log("totalSupply", totalSupply);
    });


    it("list markets with supply", async () => {
        let allMarkets = Array.from(await Comptroller.getAllMarkets()); //列出所有市場
        await Comptroller.enterMarkets(allMarkets);    //进入所有市场

        let assets = new Array(allMarkets.length);
        let symbols = new Array(allMarkets.length);
        let totalSupply = BigInt(0);
        for (let i = 0; i < allMarkets.length; i++) {
            let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
            let underlying = await vToken.underlying();
            let token = await ethers.getContractAt("BEP20Harness", underlying);
            let balance = await token.balanceOf(signer.address);
            let symbol = await token.symbol();

            await token.approve(await vToken.getAddress(), balance);
            await vToken.mint(balance);
            let vTotalSupply = await vToken.totalSupply();
         
            let cashAmount = await vToken.getCash();
            let borrowAmount = await vToken.totalBorrows();
            let exchangeRate = await vToken.exchangeRateStored();
            let reserveAmount = await vToken.totalReserves();

            chai.expect(vTotalSupply).to.be.equal(balance);
            chai.expect(exchangeRate).to.be.equal(big18);
            chai.expect(cashAmount).to.be.equal(balance);
            chai.expect(borrowAmount).to.be.equal(0);
            chai.expect(reserveAmount).to.be.equal(0);
            chai.expect(vTotalSupply * exchangeRate/big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

            let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
            let price = await oracle.getUnderlyingPrice(allMarkets[i]);
            // console.log("price", price);
            assets[i] = vTotalSupply * exchangeRate * price/(big18*big18*big18);
            symbols[i] = symbol;
        }

        for (let i = 0; i < allMarkets.length; i++) {
            // console.log(symbols[i], assets[i]);
            totalSupply += assets[i];
        }

        chai.expect(totalSupply).to.be.equal(29700000n);
        // console.log("totalSupply", totalSupply);
    });


    it("mint and repay VAI", async () => {
        await Comptroller.enterMarkets([await vBTC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);

        let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail

        let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
        let price = await oracle.getUnderlyingPrice(await vBTC.getAddress());
        [, collateralFactor, ] = await Comptroller.markets(await vBTC.getAddress());
        chai.expect(mintableAmount).to.be.equal(WBTCBalance * price * collateralFactor / (big18*big18));

        let half = mintableAmount / 2n;
        await VaiInstance.mintVAI(half);

        let VAIbalance = await VAI.balanceOf(signer.address);
        let totalSupply = await VAI.totalSupply();
        let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        chai.expect(VAIbalance).to.be.equal(half);
        chai.expect(totalSupply).to.be.equal(half);
        chai.expect(repayAmount).to.be.equal(half);

        let [, remainedMintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(remainedMintableAmount).to.be.equal(half);

        let quarter = half / 2n;
        await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
        await VaiInstance.repayVAI(quarter);

        VAIbalance = await VAI.balanceOf(signer.address);
        totalSupply = await VAI.totalSupply();
        repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        chai.expect(VAIbalance).to.be.equal(quarter);
        chai.expect(totalSupply).to.be.equal(quarter);
        chai.expect(repayAmount).to.be.equal(quarter);

        //no interest accumulated
        let blkNumber1 = await ethers.provider.getBlockNumber();
        await network.provider.send("hardhat_mine", ["0x6400"]);
        let blkNumber2 = await ethers.provider.getBlockNumber();
        chai.expect(blkNumber2).to.be.equal(blkNumber1 + 25600);

        repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        chai.expect(repayAmount).to.be.equal(quarter);
    });

    it("Borrow USDT/USDC fail beacuse borrow action is paused = 0", async () => {
        //signer enter vUSDT/vUSDC markets
        await Comptroller.enterMarkets([await vUSDC.getAddress(), await vUSDT.getAddress()]);
        let USDCBalance = await USDC.balanceOf(signer.address);
        await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
        await vUSDC.mint(USDCBalance);

        let USDTBalance = await USDT.balanceOf(signer.address);
        await USDT.approve(await vUSDT.getAddress(), ethers.MaxUint256);
        await vUSDT.mint(USDTBalance);

        //signer transfer WBTC to account1
        let  WBTCbalance = await WBTC.balanceOf(signer.address);
        await WBTC.transfer(account1.address, WBTCbalance);
        let WBTCBalance1 = await WBTC.balanceOf(account1.address);
        chai.expect(WBTCBalance1).to.be.equal(WBTCbalance);

        //account1 enter vBTC market
        await Comptroller.connect(account1).enterMarkets([await vBTC.getAddress()]);
        await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.connect(account1).mint(WBTCBalance1);

        //
        [,liquidity, ] = await Comptroller.getAccountLiquidity(signer.address);
        [,liquidity1, ] = await Comptroller.getAccountLiquidity(account1.address);

        chai.expect(liquidity).to.be.equal(16000000000000000000000000n);
        chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);

    
        await chai.expect(
            vUSDT.connect(account1).borrow(100n *big18)
        ).to.be.revertedWith("action is paused");

        await chai.expect(
            vUSDC.connect(account1).borrow(100n *big18)
        ).to.be.revertedWith("action is paused");
        
        await chai.expect(
            vBTC.borrow(10n *big18)
        ).to.be.revertedWith("action is paused");
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
        // console.log("membership", membership);

        //用户借出的VAI 
        let VAIbalance = await VAI.balanceOf(signer.address);
        chai.expect(VAIbalance).to.be.equal(half);

        let [, remainedMintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        chai.expect(remainedMintableAmount).to.be.equal(half);

        let borrowLimitedUsed = VAIbalance * BigInt(100) / (VAIbalance + remainedMintableAmount);
        chai.expect(borrowLimitedUsed).to.be.equal(50);
    });

    it("enter markets success check membership", async () => {
        let allMarkets = Array.from(await Comptroller.getAllMarkets());  //列出所有市場
        await Comptroller.enterMarkets(allMarkets);  

        for (let i = 0; i < allMarkets.length; i++) {
            let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
            chai.expect(await Comptroller.checkMembership(signer.address,allMarkets[i])).to.be.equal(true);  //true = membervToken.membership(signer.address);
            chai.expect(await Comptroller.checkMembership(account1.address, allMarkets[i])).to.be.equal(false);
            chai.expect(await Comptroller.checkMembership(account2.address, allMarkets[i])).to.be.equal(false);
        }
    });

    it("Exits markets success", async () => {
        await Comptroller.enterMarkets([await vUSDC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress()]);
        await Comptroller.exitMarket(await vUSDC.getAddress());
    });

    it("Exits markets success even thought not enter before", async () => {
        await Comptroller.exitMarket(await vUSDC.getAddress());
    });

    it("Exits markets success even mint vBTC ", async () => {
        await Comptroller.enterMarkets([await vBTC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);
        await Comptroller.exitMarket(await vUSDC.getAddress());
    });

    it("Exits markets fail beause loan != 0 ", async () => {
        await Comptroller.enterMarkets([await vBTC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
        let WBTCBalance = await WBTC.balanceOf(signer.address);
        await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        await vBTC.mint(WBTCBalance);

        let [, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        let half = mintableAmount / 2n;
        await VaiInstance.mintVAI(half);

        let VAIbalance = await VAI.balanceOf(signer.address);
        let totalSupply = await VAI.totalSupply();
        let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        chai.expect(VAIbalance).to.be.equal(half);
        chai.expect(totalSupply).to.be.equal(half);
        chai.expect(repayAmount).to.be.equal(half);

        await chai.expect(
            await Comptroller.exitMarket(await vBTC.getAddress())
        ).to.be.revertedWith("action is paused");

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