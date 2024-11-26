
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");
const { int } = require("hardhat/internal/core/params/argumentTypes");



describe("Comptroller_1", () => {

    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance, oracle;
    let signer, account1, account2;
    const big18 = BigInt(10) ** BigInt(18);
    const big17 = BigInt(10) ** BigInt(17);
    const big16 = BigInt(10) ** BigInt(16);

    beforeEach(async function () {
        [signer, account1, account2] = await ethers.getSigners();
        const { comptroller, vTokenInstanceUSDT, vTokenInstanceUSDC, vTokenInstanceBTC, vai, vaiInstance, mockPriceOracleInstance } = await deployVai();
        Comptroller = comptroller;
        vUSDT = vTokenInstanceUSDT;
        vUSDC = vTokenInstanceUSDC;
        vBTC = vTokenInstanceBTC;
        VAI = vai;
        VaiInstance = vaiInstance;
        oracle = mockPriceOracleInstance;
        USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
        USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());
        WBTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    });

    describe("init check", () => {
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
                [, collateralFactorMantissa,] = await Comptroller.markets(allMarkets[i]);
                chai.expect(collateralFactorMantissa).to.be.equal(collateralFactor[i]);
            }
        });
    
    
        it("Check initial borrow cap", async () => {
            let allMarkets = await Comptroller.getAllMarkets();
    
            for (let i = 0; i < allMarkets.length; i++) {
                let cap = await Comptroller.borrowCaps(allMarkets[i]);
                chai.expect(cap).to.be.equal(0n);
            }
        });
    
        it("Check VAI repay rate", async () => {
            let repayRateYearly = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRateYearly).to.be.equal(0);
    
            repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            chai.expect(repayRatePerBlock).to.be.equal(0);
        });

        it ("Check liquidationIncentiveMantissa", async() =>{
            let incentive = await Comptroller.liquidationIncentiveMantissa();
            chai.expect(incentive / big16).to.be.equal(105);
        })

        it ("Check close fator", async() =>{
            let closeFactor = await Comptroller.closeFactorMantissa();
            chai.expect(closeFactor / big17).to.be.equal(5);
        })
    })

    describe("mint/tranfer/redeem vBTC  ", () => {
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
            chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    
            await vBTC.transfer(account1.address, big18);
            await vBTC.transfer(account2.address, BigInt(2) * big18);
    
            let vBTCBalance1 = await vBTC.balanceOf(account1.address);
            let vBTCBalance2 = await vBTC.balanceOf(account2.address);
            vBTCBalance = await vBTC.balanceOf(signer);
            chai.expect(vBTCBalance1).to.be.equal(big18);
            chai.expect(vBTCBalance2).to.be.equal(BigInt(2) * big18);
            chai.expect(vBTCBalance).to.be.equal(WBTCBalance - big18 - BigInt(2) * big18);
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
            chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
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
            chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
        });
    
    
        // initially, signer has 100 BTC
        it("transfer BTC then Mint vBTC Success", async () => {
            await WBTC.transfer(account1.address, BigInt(1) * big18);
            let WBTCBalance1 = await WBTC.balanceOf(account1.address);
            chai.expect(WBTCBalance1).to.be.equal(BigInt(1) * big18);
    
            await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account1).mint(WBTCBalance1);
            let vBTCBalance1 = await vBTC.balanceOf(account1.address);
            chai.expect(vBTCBalance1).to.be.equal(WBTCBalance1);
            chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);
    
    
            await WBTC.transfer(account2.address, BigInt(2) * big18);
            let WBTCBalance2 = await WBTC.balanceOf(account2.address);
            chai.expect(WBTCBalance2).to.be.equal(BigInt(2) * big18);
    
            await WBTC.connect(account2).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account2).mint(WBTCBalance2);
            let vBTCBalance2 = await vBTC.balanceOf(account2.address);
            chai.expect(vBTCBalance2).to.be.equal(WBTCBalance2);
            chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);
    
    
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(BigInt(97) * big18);
    
    
            let vTotalSupply = await vBTC.totalSupply();
            let cashAmount = await vBTC.getCash();
            let borrowAmount = await vBTC.totalBorrows();
            let exchangeRate = await vBTC.exchangeRateStored();
            let reserveAmount = await vBTC.totalReserves();
            chai.expect(vTotalSupply).to.be.equal(WBTCBalance1 + WBTCBalance2);
            chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
            chai.expect(cashAmount).to.be.equal(WBTCBalance1 + WBTCBalance2);
            chai.expect(borrowAmount).to.be.equal(0);
            chai.expect(reserveAmount).to.be.equal(0);
            chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
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
    });
   
    describe("list markets", () => {
     
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
                chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
    
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
                chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply
    
                let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
                let price = await oracle.getUnderlyingPrice(allMarkets[i]);
                // console.log("price", price);
                assets[i] = vTotalSupply * exchangeRate * price / (big18 * big18 * big18);
                symbols[i] = symbol;
            }
    
            for (let i = 0; i < allMarkets.length; i++) {
                // console.log(symbols[i], assets[i]);
                totalSupply += assets[i];
            }
    
            chai.expect(totalSupply).to.be.equal(29700000n);
            // console.log("totalSupply", totalSupply);
        });
    
    }); 


    describe("mint and repay VAI", () => {
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
            [, collateralFactor,] = await Comptroller.markets(await vBTC.getAddress());
            chai.expect(mintableAmount).to.be.equal(WBTCBalance * price * collateralFactor / (big18 * big18));
    
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

        it("mint VAI more than liquidity ", async () => {
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            const markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(WBTCBalance);
    
            let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
            chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail

            await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            
            await VaiInstance.mintVAI(mintableAmount + 1n);

            let VAIbalance = await VAI.balanceOf(signer.address);
            let totalSupply = await VAI.totalSupply();
            let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
            chai.expect(VAIbalance).to.be.equal(0);
            chai.expect(totalSupply).to.be.equal(0);
            chai.expect(repayAmount).to.be.equal(0);
        });

        it("repay VAI more than self minted", async () => {
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            await WBTC.transfer(account1.address, WBTCBalance);
            let WBTCBalance1 = await WBTC.balanceOf(account1.address);
            chai.expect(WBTCBalance1).to.be.equal(WBTCBalance);
    
            //signer enters usdc market and mint VAI
            await Comptroller.enterMarkets([ await vUSDC.getAddress()]);
            let USDCBalance = await USDC.balanceOf(signer.address);
            await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
            await vUSDC.mint(USDCBalance);
            [,liquidity, ] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(8000000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
      
            let mintAmount = liquidity;
            await VaiInstance.mintVAI(mintAmount);
            let VAIbalance = await VAI.balanceOf(signer.address);
            let totalSupply = await VAI.totalSupply();
            let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
            chai.expect(VAIbalance).to.be.equal(mintAmount);
            chai.expect(totalSupply).to.be.equal(mintAmount);
            chai.expect(repayAmount).to.be.equal(mintAmount);
    
            //account1 enters BTC market and mint VAI
            await Comptroller.connect(account1).enterMarkets([ await vBTC.getAddress()]);
            await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account1).mint(WBTCBalance);
            [,liquidity1, shortfall1] = await Comptroller.getAccountLiquidity(account1.address);
            chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall1).to.be.equal(0);
    
            let mintAmount1 = liquidity1;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1Before = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1Before).to.be.equal(mintAmount1);
            chai.expect(totalSupply).to.be.equal(mintAmount1 + mintAmount);
            chai.expect(repayAmount1).to.be.equal(mintAmount1);
            
            //signer transfer 1e^-18 vai to account1
            await VAI.transfer(account1.address, 1n);
            let VAIbalance1After = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1After).to.be.equal(mintAmount1+1n);
            chai.expect(totalSupply).to.be.equal(mintAmount1 + mintAmount);
            chai.expect(repayAmount1).to.be.equal(mintAmount1);

            //account1 repay 1e^-18 vai 
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.connect(account1).repayVAI(VAIbalance1After);

            VAIbalance1After = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1After).to.be.equal(1n);
            chai.expect(totalSupply).to.be.equal(mintAmount);
            chai.expect(repayAmount1).to.be.equal(0);

        });
    });

    describe("Borrow token", () => {
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
            let WBTCbalance = await WBTC.balanceOf(signer.address);
            await WBTC.transfer(account1.address, WBTCbalance);
            let WBTCBalance1 = await WBTC.balanceOf(account1.address);
            chai.expect(WBTCBalance1).to.be.equal(WBTCbalance);
    
            //account1 enter vBTC market
            await Comptroller.connect(account1).enterMarkets([await vBTC.getAddress()]);
            await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account1).mint(WBTCBalance1);
    
            //
            [, liquidity,] = await Comptroller.getAccountLiquidity(signer.address);
            [, liquidity1,] = await Comptroller.getAccountLiquidity(account1.address);
    
            chai.expect(liquidity).to.be.equal(16000000000000000000000000n);
            chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);
    
    
            await chai.expect(
                vUSDT.connect(account1).borrow(100n * big18)
            ).to.be.revertedWith("action is paused");
    
            await chai.expect(
                vUSDC.connect(account1).borrow(100n * big18)
            ).to.be.revertedWith("action is paused");
    
            await chai.expect(
                vBTC.borrow(10n * big18)
            ).to.be.revertedWith("action is paused");
        });
    });
   

    describe("account status", async() =>{
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
    }); 
   

    describe("liquidity calculation", async()=>{
        it("Liquidity calculations after enter/exit market ", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(initialBalance);
    
            let vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            //liquidity calculation before enter market
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            //liquidity calculation after enter market
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(6790000000000000000000000n);
            chai.expect(shortfall).to.be.equal(0);
    
            //liquidity calculation after exit market
            await Comptroller.exitMarket(await vBTC.getAddress());
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
        });
    
        it("Liquidity calculations after mint some VAI", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(initialBalance);
    
            let vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            //liquidity calculation before enter market
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            //liquidity calculation after enter market
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(6790000000000000000000000n);
            chai.expect(shortfall).to.be.equal(0);
    
            let mintAmountEach = 100n * big18;
            for (let i = 0; i < 10; i++) {
            
                await VaiInstance.mintVAI(mintAmountEach);
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(6790000000000000000000000n- BigInt(i+1)*mintAmountEach);
                chai.expect(shortfall).to.be.equal(0);
            }
        });
    
        it("Liquidity calculations after repay some VAI", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(initialBalance);
    
            let vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            //liquidity calculation before enter market
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            //liquidity calculation after enter market
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(6790000000000000000000000n);
            chai.expect(shortfall).to.be.equal(0);
    
            let mintAmountEach = 100n * big18;
            for (let i = 0; i < 10; i++) {
            
                await VaiInstance.mintVAI(mintAmountEach);
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(6790000000000000000000000n- BigInt(i+1)*mintAmountEach);
                chai.expect(shortfall).to.be.equal(0);
            }
        });
    
    
        it("Liquidity calculations when price change", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(initialBalance);
    
            let vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            //liquidity calculation before enter market
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            //liquidity calculation after enter market
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(6790000000000000000000000n);
            chai.expect(shortfall).to.be.equal(0);
    
            let priceChangeStep = BigInt(1000);
            let liquidityChangeStep = (priceChangeStep * initialBalance * 7n)/10n;
            for (let i = 0; i < 10; i++) {
                await oracle.setUnderlyingPrice(await vBTC.getAddress(), (BigInt(97000) - BigInt(i+1) * priceChangeStep) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(6790000000000000000000000n- BigInt(i+1)*liquidityChangeStep);
                chai.expect(shortfall).to.be.equal(0);
            }
    
            for (let i = 0; i < 10; i++) {
                await oracle.setUnderlyingPrice(await vBTC.getAddress(), (BigInt(97000) + BigInt(i+1) * priceChangeStep) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(6790000000000000000000000n + BigInt(i+1)*liquidityChangeStep);
                chai.expect(shortfall).to.be.equal(0);
            }
        });
    
        it("Liquidity calculations when mint vToken iteratively", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            let mintAmountEach = initialBalance/10n;
            let liqidityAmountEach = 6790000000000000000000000n / 10n;
    
            //liquidity calculation after enter market 
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);
            chai.expect(shortfall).to.be.equal(0);
    
            for (let i = 0; i < 10; i++) {
                await vBTC.mint(mintAmountEach);
    
                let vBTCBalance = await vBTC.balanceOf(signer.address);
                chai.expect(vBTCBalance).to.be.equal(mintAmountEach*(BigInt(i+1)));
                let WBTCBalance = await WBTC.balanceOf(signer.address);
                chai.expect(WBTCBalance).to.be.equal(initialBalance - mintAmountEach*(BigInt(i+1)));
    
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(liqidityAmountEach*(BigInt(i+1)));
            }
        });
    
        it("Liquidity calculations when redeem vToken iteratively", async () => {
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            let redeemAmountEach = initialBalance/10n;
            let liqidityAmountEach = 6790000000000000000000000n / 10n;
    
            //liquidity calculation after enter market 
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            await vBTC.mint(initialBalance);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(liqidityAmountEach * 10n);
            chai.expect(shortfall).to.be.equal(0);
    
            for (let i = 0; i < 10; i++) {
                await vBTC.redeem(redeemAmountEach);
                [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
                chai.expect(liquidity).to.be.equal(liqidityAmountEach*(BigInt(10) - BigInt(i+1)));
                chai.expect(shortfall).to.be.equal(0);
            }
        });
    });
 
    describe("enter/exist market", async()=>{
        it("enter markets success check membership", async () => {
            let allMarkets = Array.from(await Comptroller.getAllMarkets());  //列出所有市場
            await Comptroller.enterMarkets(allMarkets);
    
            for (let i = 0; i < allMarkets.length; i++) {
                let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
                chai.expect(await Comptroller.checkMembership(signer.address, allMarkets[i])).to.be.equal(true);  //true = membervToken.membership(signer.address);
                chai.expect(await Comptroller.checkMembership(account1.address, allMarkets[i])).to.be.equal(false);
                chai.expect(await Comptroller.checkMembership(account2.address, allMarkets[i])).to.be.equal(false);
            }
        });
    
    
        it("Enter and Exits markets success, no vToken mint", async () => {
            let allMarkets = await Comptroller.getAllMarkets();
    
            for (let i = 0; i < allMarkets.length; i++) {
                await Comptroller.enterMarkets([await allMarkets[i]]);
                let markets = await Comptroller.getAssetsIn(signer.address);
                chai.expect(markets).to.be.deep.equal([await allMarkets[i]]);
                await Comptroller.exitMarket(await allMarkets[i]);
                markets = await Comptroller.getAssetsIn(signer.address);
                chai.expect(markets).to.be.deep.equal([]);
            }
           
        });
    
        it("Exits markets success even thought not enter before", async () => {
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
            let res = await Comptroller.exitMarket(await vUSDC.getAddress());
            let receipt = await res.wait();
            chai.expect(receipt.status).to.be.equal(1);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
        });
    
        it("Exits markets success even mint vBTC ", async () => {
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
            let initialBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(initialBalance);
    
            let vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
    
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            //exit market
            await Comptroller.exitMarket(await vBTC.getAddress());
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
    
            WBTCBalance = await WBTC.balanceOf(signer.address);
            chai.expect(WBTCBalance).to.be.equal(0);
    
            vBTCBalance = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalance).to.be.equal(initialBalance);
        });
    
        it("Exits markets fail beause loan > 0 ", async () => {
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            let markets = await Comptroller.getAssetsIn(signer.address);
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
    
            await Comptroller.exitMarket(await vBTC.getAddress())
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]); 
            
        });
    
    
        it("Exits markets success after repay all VAI", async () => {
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            let markets = await Comptroller.getAssetsIn(signer.address);
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
            // console.log("half, VAIbalance", "totalSupply", half, VAIbalance, totalSupply);
    
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(half);   
            chai.expect(shortfall).to.be.equal(0);
    
            //try to exit market with paying none, fail beacause loan > 0
            await Comptroller.exitMarket(await vBTC.getAddress())
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]); 
    
           //try to exit market with paying (half - 1) VAI
           await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
           await VaiInstance.repayVAI(half - 1n);
           await Comptroller.exitMarket(await vBTC.getAddress())
           markets = await Comptroller.getAssetsIn(signer.address);
           chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]); 
    
            //after pay all loan, exit market successfully
            VAIbalance = await VAI.balanceOf(signer.address);
            totalSupply = await VAI.totalSupply();
         
            repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
            //console.log("VAIbalance", "totalSupply", "repayAmount", VAIbalance, totalSupply,repayAmount);
            await VaiInstance.repayVAI(repayAmount);
            await Comptroller.exitMarket(await vBTC.getAddress())
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([]);
    
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(0);   
            chai.expect(shortfall).to.be.equal(0);
            
        });
    
    
        it("Exits one market success beause remained liquidity > load", async () => {
            await Comptroller.enterMarkets([ await vUSDC.getAddress(), await vBTC.getAddress()]);
            let markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress(), await vBTC.getAddress()]);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(WBTCBalance);
    
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(6790000000000000000000000n);   //liqidity provided by vBTC= 6790000000000000000000000n
            chai.expect(shortfall).to.be.equal(0);
    
            let USDCBalance = await USDC.balanceOf(signer.address);
            await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
            await vUSDC.mint(USDCBalance);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(14790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall).to.be.equal(0);
    
            //loan = 7000000000000000000000000n, // 8000000000000000000000000n >7000000000000000000000000n > 6790000000000000000000000n
            let mintAmount = 7000000000000000000000000n; 
            await VaiInstance.mintVAI(mintAmount);
    
            let VAIbalance = await VAI.balanceOf(signer.address);
            let totalSupply = await VAI.totalSupply();
            let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
            chai.expect(VAIbalance).to.be.equal(mintAmount);
            chai.expect(totalSupply).to.be.equal(mintAmount);
            chai.expect(repayAmount).to.be.equal(mintAmount);
    
            //recalculate liquidity after mint VAI
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(7790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall).to.be.equal(0);
    
            //success exist vBTC, beause usdc liquidity(8000000000000000000000000n) > loan(7000000000000000000000000n)
            await Comptroller.exitMarket(await vBTC.getAddress())
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress()]); 
    
            //fail to exit vUSDC, beause loan(7000000000000000000000000n) >0 
            await Comptroller.exitMarket(await vUSDC.getAddress())
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress()]);
    
            //reenter vBTC market 
            await Comptroller.enterMarkets([await vBTC.getAddress()]);
            markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress(),await vBTC.getAddress()]);
            [,liquidity, shortfall] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(7790000000000000000000000n);
            chai.expect(shortfall).to.be.equal(0);
    
             //fail to exit vUSDC, beause vBTC liquidity(6790000000000000000000000n) < load(7000000000000000000000000n)
             await Comptroller.exitMarket(await vUSDC.getAddress())
             markets = await Comptroller.getAssetsIn(signer.address);
             chai.expect(markets).to.be.deep.equal([await vUSDC.getAddress(),await vBTC.getAddress()]);
        });            
    });

    describe("liquidate", async() =>{
        beforeEach(async function () {
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            await WBTC.transfer(account1.address, WBTCBalance);
            let WBTCBalance1 = await WBTC.balanceOf(account1.address);
            chai.expect(WBTCBalance1).to.be.equal(WBTCBalance);
    
            //signer enters usdc market and mint VAI
            await Comptroller.enterMarkets([ await vUSDC.getAddress()]);
            let USDCBalance = await USDC.balanceOf(signer.address);
            await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
            await vUSDC.mint(USDCBalance);
            [,liquidity, ] = await Comptroller.getAccountLiquidity(signer.address);
            chai.expect(liquidity).to.be.equal(8000000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
      
            let mintAmount = liquidity;
            await VaiInstance.mintVAI(mintAmount);
            let VAIbalance = await VAI.balanceOf(signer.address);
            let totalSupply = await VAI.totalSupply();
            let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
            chai.expect(VAIbalance).to.be.equal(mintAmount);
            chai.expect(totalSupply).to.be.equal(mintAmount);
            chai.expect(repayAmount).to.be.equal(mintAmount);
    
            //account1 enters BTC market and mint VAI
            await Comptroller.connect(account1).enterMarkets([ await vBTC.getAddress()]);
            await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account1).mint(WBTCBalance);
            [,liquidity1, shortfall1] = await Comptroller.getAccountLiquidity(account1.address);
            chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall1).to.be.equal(0);
    
            let mintAmount1 = liquidity1;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(totalSupply).to.be.equal(mintAmount1 + mintAmount);
            chai.expect(repayAmount1).to.be.equal(mintAmount1);
    
            //BTC price down to 60000
            await oracle.setUnderlyingPrice(await vBTC.getAddress(), BigInt(60000) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
        });

        it("liquidate exact closeFactor", async () => {
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

            //signer liquidate account1's loan
            let closeFactor = await Comptroller.closeFactorMantissa();
            chai.expect(closeFactor).to.be.equal(5n *big17);
            liquiditionAmount = repayAmount1Before * closeFactor / big18;
            chai.expect(liquiditionAmount).to.be.equal(3395000000000000000000000n);
             
            [res, seizedAmount] = await Comptroller.liquidateVAICalculateSeizeTokens(await vBTC.getAddress(), liquiditionAmount);
            chai.expect(res).to.be.equal(0);
            chai.expect(seizedAmount).to.be.equal(59412500000000000000n);
            
            //signer assets before liquidation
            vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceBefore).to.be.equal(0);
            VAIBalanceBefore = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);

            //account assets before liquidation
            vBTCBalance1Before = await vBTC.balanceOf(account1.address);
            chai.expect(vBTCBalance1Before).to.be.equal(100000000000000000000n);
            VAIBalance1Before = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1Before).to.be.equal(6790000000000000000000000n);
            
            let totalSupplyBefore = await VAI.totalSupply();

            let mintedVAIAmount1Before = await Comptroller.mintedVAIs(account1.address);
            chai.expect(mintedVAIAmount1Before).to.be.equal(repayAmount1Before);
            chai.expect(mintedVAIAmount1Before).to.be.equal(VAIBalance1Before);
        
            await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await chai.expect(
                VaiInstance.liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress())
            ).to.emit(VaiInstance, "LiquidateVAI");

            //signer‘s asset after liquiation， pay 3395000 VAI, seized 59.4125 BTC
            vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
            VAIBalanceAfter = await VAI.balanceOf(signer.address);
            chai.expect(vBTCBalanceAfter).to.be.equal(seizedAmount);
            chai.expect(VAIBalanceBefore - VAIBalanceAfter).to.be.equal(liquiditionAmount);
            
            //account1's asset after liquidation, lost 59.4125 BTC
            let vBTCBalance1After = await vBTC.balanceOf(account1.address);
            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(vBTCBalance1Before - vBTCBalance1After).to.be.equal(seizedAmount);
            chai.expect(VAIBalance1After).to.be.equal(VAIBalance1Before);
          
            let totalSupplyAfter = await VAI.totalSupply();
            chai.expect(totalSupplyBefore - totalSupplyAfter).to.be.equal(liquiditionAmount);

            let mintedVAIAmount1After = await Comptroller.mintedVAIs(account1.address);
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(mintedVAIAmount1After).to.be.equal(repayAmount1After);
            chai.expect(mintedVAIAmount1Before - mintedVAIAmount1After).to.be.equal(liquiditionAmount);
          

            [,,shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
            let exchangeRate = await vBTC.exchangeRateStored();
            let price = await oracle.getUnderlyingPrice(await vBTC.getAddress());
            [, collateralFactor,] = await Comptroller.markets(await vBTC.getAddress());
            let supply1After =  vBTCBalance1After * exchangeRate * price * collateralFactor /(big18**BigInt(3));
            let calculatedShorfall =  repayAmount1After - supply1After;
            chai.expect(calculatedShorfall).to.be.equal(shortfall1After)
        });


        it("liquidate more than closeFactor", async () => {
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

            //signer liquidate account1's loan
            let closeFactor = await Comptroller.closeFactorMantissa();
            chai.expect(closeFactor).to.be.equal(5n *big17);
            liquiditionAmount = repayAmount1Before * closeFactor / big18 + 1n; 
            chai.expect(liquiditionAmount).to.be.equal(3395000000000000000000001n);
    
            vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceBefore).to.be.equal(0);
            VAIBalanceBefore = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);

            await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress());

            [,liquidity1After, shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
            chai.expect(liquidity1After).to.be.equal(0);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall1After).to.be.equal(2590000000000000000000000n);  

            let vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceAfter).to.be.equal(vBTCBalanceBefore);
            let VAIBalanceAfter = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceAfter).to.be.equal(VAIBalanceBefore);
        });

        it("liquidate less than closeFactor", async () => {
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

            //signer liquidate account1's loan
            let closeFactor = await Comptroller.closeFactorMantissa();
            chai.expect(closeFactor).to.be.equal(5n *big17);
            liquiditionAmount = repayAmount1Before * closeFactor / big18 - 1n;
            chai.expect(liquiditionAmount).to.be.equal(3394999999999999999999999n);
             
            [res, seizedAmount] = await Comptroller.liquidateVAICalculateSeizeTokens(await vBTC.getAddress(), liquiditionAmount);
            chai.expect(res).to.be.equal(0);
            chai.expect(seizedAmount).to.be.equal(59412499999999999999n);
            
            //signer assets before liquidation
            vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceBefore).to.be.equal(0);
            VAIBalanceBefore = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);

            //account assets before liquidation
            vBTCBalance1Before = await vBTC.balanceOf(account1.address);
            chai.expect(vBTCBalance1Before).to.be.equal(100000000000000000000n);
            VAIBalance1Before = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1Before).to.be.equal(6790000000000000000000000n);
            
            let totalSupplyBefore = await VAI.totalSupply();

            let mintedVAIAmount1Before = await Comptroller.mintedVAIs(account1.address);
            chai.expect(mintedVAIAmount1Before).to.be.equal(repayAmount1Before);
            chai.expect(mintedVAIAmount1Before).to.be.equal(VAIBalance1Before);
        
            await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await chai.expect(
                VaiInstance.liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress())
            ).to.emit(VaiInstance, "LiquidateVAI");

            //signer‘s asset after liquiation， pay 3395000 VAI, seized 59.4125 BTC
            vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
            VAIBalanceAfter = await VAI.balanceOf(signer.address);
            chai.expect(vBTCBalanceAfter).to.be.within(seizedAmount-1000n, seizedAmount+1000n);
            chai.expect(VAIBalanceBefore - VAIBalanceAfter).to.be.within(liquiditionAmount-10000000n, liquiditionAmount+10000000n);
            
            //account1's asset after liquidation, lost 59.4125 BTC
            let vBTCBalance1After = await vBTC.balanceOf(account1.address);
            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(vBTCBalance1Before - vBTCBalance1After).to.be.within(seizedAmount-1000n, seizedAmount+1000n);
            chai.expect(VAIBalance1After).to.be.equal(VAIBalance1Before);
          
            let totalSupplyAfter = await VAI.totalSupply();
            chai.expect(totalSupplyBefore - totalSupplyAfter).to.be.within(liquiditionAmount-10000000n, liquiditionAmount+10000000n);

            let mintedVAIAmount1After = await Comptroller.mintedVAIs(account1.address);
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(mintedVAIAmount1After).to.be.equal(repayAmount1After);
            chai.expect(mintedVAIAmount1Before - mintedVAIAmount1After).to.be.within(liquiditionAmount-10000000n, liquiditionAmount+10000000n);
          

            [,,shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
            let exchangeRate = await vBTC.exchangeRateStored();
            let price = await oracle.getUnderlyingPrice(await vBTC.getAddress());
            [, collateralFactor,] = await Comptroller.markets(await vBTC.getAddress());
            let supply1After =  vBTCBalance1After * exchangeRate * price * collateralFactor /(big18**BigInt(3));
            let calculatedShorfall =  repayAmount1After - supply1After;
            chai.expect(calculatedShorfall).to.be.equal(shortfall1After)
        });

        it("liquidation amount change when incensitive change", async () => {
            let repayAmount = await VaiInstance.getVAIRepayAmount(account1.address);

            //calculate seizedAmount 
            let closeFactor = await Comptroller.closeFactorMantissa();
            chai.expect(closeFactor).to.be.equal(5n *big17);
            liquiditionAmount = repayAmount * closeFactor / big18;
            chai.expect(liquiditionAmount).to.be.equal(3395000000000000000000000n);
             
            [res, seizedAmount] = await Comptroller.liquidateVAICalculateSeizeTokens(await vBTC.getAddress(), liquiditionAmount);
            chai.expect(res).to.be.equal(0);
            chai.expect(seizedAmount).to.be.equal(59412500000000000000n);

            //new incentive = 110%
            await Comptroller._setLiquidationIncentive((big18 + big16*10n), { gasLimit: "0x1000000" });

            [res, seizedAmount] = await Comptroller.liquidateVAICalculateSeizeTokens(await vBTC.getAddress(), liquiditionAmount);
            chai.expect(res).to.be.equal(0);
            chai.expect(seizedAmount).to.be.equal(62241666666665535000n);
        });

        it("liquidate fail beacuse liquidator = borrower", async () => {
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
             //signer liquidate account1's loan
             let closeFactor = await Comptroller.closeFactorMantissa();
             chai.expect(closeFactor).to.be.equal(5n *big17);
             liquiditionAmount = repayAmount1Before * closeFactor / big18; 
             chai.expect(liquiditionAmount).to.be.equal(3395000000000000000000000n);
     
             vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
             chai.expect(vBTCBalanceBefore).to.be.equal(0);
             VAIBalanceBefore = await VAI.balanceOf(signer.address);
             chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);
 
             await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
             await VaiInstance.connect(account1).liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress());
 
             [,liquidity1After, shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
             chai.expect(liquidity1After).to.be.equal(0);  // liqidity provided by vUSDC= 8000000000000000000000000n
             chai.expect(shortfall1After).to.be.equal(2590000000000000000000000n);  
 
             let vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
             chai.expect(vBTCBalanceAfter).to.be.equal(vBTCBalanceBefore);
             let VAIBalanceAfter = await VAI.balanceOf(signer.address);
             chai.expect(VAIBalanceAfter).to.be.equal(VAIBalanceBefore);
        });

        it("liquidate fail beacuse liquidation amount = 0", async () => {
              //signer liquidate account1's loan
              liquiditionAmount = 0n 
       
              vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
              chai.expect(vBTCBalanceBefore).to.be.equal(0);
              VAIBalanceBefore = await VAI.balanceOf(signer.address);
              chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);
  
              await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
              await VaiInstance.connect(account1).liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress());
  
              [,liquidity1After, shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
              chai.expect(liquidity1After).to.be.equal(0);  // liqidity provided by vUSDC= 8000000000000000000000000n
              chai.expect(shortfall1After).to.be.equal(2590000000000000000000000n);  
  
              let vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
              chai.expect(vBTCBalanceAfter).to.be.equal(vBTCBalanceBefore);
              let VAIBalanceAfter = await VAI.balanceOf(signer.address);
              chai.expect(VAIBalanceAfter).to.be.equal(VAIBalanceBefore);
        });

        it("liquidate fail beacuse liquidation amount = uint256(-1)", async () => {
            liquiditionAmount = ethers.MaxUint256;
       
            vBTCBalanceBefore = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceBefore).to.be.equal(0);
            VAIBalanceBefore = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceBefore).to.be.equal(8000000000000000000000000n);

            await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.connect(account1).liquidateVAI(account1.address, liquiditionAmount, vBTC.getAddress());

            [,liquidity1After, shortfall1After] = await Comptroller.getAccountLiquidity(account1.address);
            chai.expect(liquidity1After).to.be.equal(0);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall1After).to.be.equal(2590000000000000000000000n);  

            let vBTCBalanceAfter = await vBTC.balanceOf(signer.address);
            chai.expect(vBTCBalanceAfter).to.be.equal(vBTCBalanceBefore);
            let VAIBalanceAfter = await VAI.balanceOf(signer.address);
            chai.expect(VAIBalanceAfter).to.be.equal(VAIBalanceBefore);
        });

    });
})