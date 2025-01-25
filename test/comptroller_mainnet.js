
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_with_DChain");
const { int } = require("hardhat/internal/core/params/argumentTypes");

describe("Comptroller_1", () => {

    let Comptroller, vBTC, vETH, WBTC, ETH, VAI, VaiInstance, oracle;
    let signer, account1, account2;
    const big26 = BigInt(10) ** BigInt(26);
    const big28 = BigInt(10) ** BigInt(28);
    const big18 = BigInt(10) ** BigInt(18);
    const big17 = BigInt(10) ** BigInt(17);
    const big16 = BigInt(10) ** BigInt(16);
    const big8 = BigInt(10) ** BigInt(8);
    beforeEach(async function () {
        [signer, account1, account2] = await ethers.getSigners();
        const { comptroller, vTokenInstanceETH, vTokenInstanceBTC, vai, vaiInstance, PriceOracleInstance } = await deployVai();
        Comptroller = comptroller;
        vETH = vTokenInstanceETH;
        vBTC = vTokenInstanceBTC;
        VAI = vai;
        VaiInstance = vaiInstance;
        oracle = PriceOracleInstance;
        ETH = await ethers.getContractAt("BEP20Harness", await vETH.underlying());
        WBTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    });
    // describe("init check", () => {
    //     it("Check vBTC/WBTC name and symbol", async () => {
    //         let vBTCName = await vBTC.name();
    //         let vBTCSymbol = await vBTC.symbol();
    //         let vBTCDecimals = await vBTC.decimals();
    //         chai.expect(vBTCName).to.be.equal("vBTC");
    //         chai.expect(vBTCSymbol).to.be.equal("vBTC");
    //         chai.expect(vBTCDecimals).to.be.equal(8);

    //         let WBTCName = await WBTC.name();
    //         let WBTCSymbol = await WBTC.symbol();
    //         let WBTCDecimals = await WBTC.decimals();
    //         chai.expect(WBTCName).to.be.equal("Wrapped BTC");
    //         chai.expect(WBTCSymbol).to.be.equal("WBTC");
    //         chai.expect(WBTCDecimals).to.be.equal(8);

    //         let underlying = await vBTC.underlying();
    //         chai.expect(underlying).to.be.equal(await WBTC.getAddress());
    //     });


    //     it("Check initial price", async () => {
    //         let allMarkets = await Comptroller.getAllMarkets();
    //         const prices = [96981920000000000000000n, 3355980000000000000000n];

    //         let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());

    //         for (let i = 0; i < allMarkets.length; i++) {
    //             let price = await oracle.getUnderlyingPrice(allMarkets[i]);
    //             chai.expect(price).to.be.equal(prices[i]);
    //         }
    //     });


    //     it("Check initial collateral factor", async () => {
    //         let allMarkets = await Comptroller.getAllMarkets();

    //         const collateralFactor = [big17 * 8n, big17 * 8n, big17 * 7n];
    //         for (let i = 0; i < allMarkets.length; i++) {
    //             [, collateralFactorMantissa,] = await Comptroller.markets(allMarkets[i]);
    //             chai.expect(collateralFactorMantissa).to.be.equal(collateralFactor[i]);
    //         }
    //     });


    //     it("Check initial borrow cap", async () => {
    //         let allMarkets = await Comptroller.getAllMarkets();

    //         for (let i = 0; i < allMarkets.length; i++) {
    //             let cap = await Comptroller.borrowCaps(allMarkets[i]);
    //             chai.expect(cap).to.be.equal(0n);
    //         }
    //     });

    //     it("Check VAI repay rate", async () => {
    //         let repayRateYearly = await VaiInstance.getVAIRepayRate();
    //         chai.expect(repayRateYearly).to.be.equal(0);

    //         repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
    //         chai.expect(repayRatePerBlock).to.be.equal(0);
    //     });

    //     it("Check liquidationIncentiveMantissa", async () => {
    //         let incentive = await Comptroller.liquidationIncentiveMantissa();
    //         chai.expect(incentive / big16).to.be.equal(105);
    //     })

    //     it("Check close fator", async () => {
    //         let closeFactor = await Comptroller.closeFactorMantissa();
    //         chai.expect(closeFactor / big17).to.be.equal(6);
    //     })
    // })


    // describe("mint/tranfer/redeem vBTC  ", () => {
    //     it("Mint vBTC success and tranfer vBTC success", async () => {
    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         await vBTC.mint(WBTCBalance);
    //         let vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance).to.be.equal(WBTCBalance);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(0);

    //         let vTotalSupply = await vBTC.totalSupply();
    //         let cashAmount = await vBTC.getCash();
    //         let borrowAmount = await vBTC.totalBorrows();
    //         let exchangeRate = await vBTC.exchangeRateStored();
    //         let reserveAmount = await vBTC.totalReserves();
    //         chai.expect(vTotalSupply).to.be.equal(WBTCBalance);
    //         chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
    //         chai.expect(cashAmount).to.be.equal(WBTCBalance);
    //         chai.expect(borrowAmount).to.be.equal(0);
    //         chai.expect(reserveAmount).to.be.equal(0);
    //         chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);

    //         await vBTC.transfer(account1.address, big18);
    //         await vBTC.transfer(account2.address, BigInt(2) * big18);

    //         let vBTCBalance1 = await vBTC.balanceOf(account1.address);
    //         let vBTCBalance2 = await vBTC.balanceOf(account2.address);
    //         vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance1).to.be.equal(big18);
    //         chai.expect(vBTCBalance2).to.be.equal(BigInt(2) * big18);
    //         chai.expect(vBTCBalance).to.be.equal(WBTCBalance - big18 - BigInt(2) * big18);
    //     });

    //     it("Mint vBTC fail beacause of insufficient balance ", async () => {
    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         await chai.expect(
    //             vBTC.mint(WBTCBalance + big18)
    //         ).to.be.revertedWith("Insufficient balance");

    //         let vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance).to.be.equal(0);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(WBTCBalance);

    //         let vTotalSupply = await vBTC.totalSupply();
    //         let cashAmount = await vBTC.getCash();
    //         let borrowAmount = await vBTC.totalBorrows();
    //         let exchangeRate = await vBTC.exchangeRateStored();
    //         let reserveAmount = await vBTC.totalReserves();

    //         chai.expect(vTotalSupply).to.be.equal(0);
    //         chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
    //         chai.expect(cashAmount).to.be.equal(0);
    //         chai.expect(borrowAmount).to.be.equal(0);
    //         chai.expect(reserveAmount).to.be.equal(0);
    //         chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    //     });

    //     it("Mint vBTC fail beacause of not approve ", async () => {
    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         await chai.expect(
    //             vBTC.mint(big18)
    //         ).to.be.revertedWith("Insufficient allowance");

    //         let vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance).to.be.equal(0);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(WBTCBalance);

    //         let vTotalSupply = await vBTC.totalSupply();
    //         let cashAmount = await vBTC.getCash();
    //         let borrowAmount = await vBTC.totalBorrows();
    //         let exchangeRate = await vBTC.exchangeRateStored();
    //         let reserveAmount = await vBTC.totalReserves();
    //         chai.expect(vTotalSupply).to.be.equal(0);
    //         chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
    //         chai.expect(cashAmount).to.be.equal(0);
    //         chai.expect(borrowAmount).to.be.equal(0);
    //         chai.expect(reserveAmount).to.be.equal(0);
    //         chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    //     });


    //     // initially, signer has 100 BTC
    //     it("transfer BTC then Mint vBTC Success", async () => {
    //         await WBTC.transfer(account1.address, BigInt(1) * big18);
    //         let WBTCBalance1 = await WBTC.balanceOf(account1.address);
    //         chai.expect(WBTCBalance1).to.be.equal(BigInt(1) * big18);

    //         await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         await vBTC.connect(account1).mint(WBTCBalance1);
    //         let vBTCBalance1 = await vBTC.balanceOf(account1.address);
    //         chai.expect(vBTCBalance1).to.be.equal(WBTCBalance1);
    //         chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);


    //         await WBTC.transfer(account2.address, BigInt(2) * big18);
    //         let WBTCBalance2 = await WBTC.balanceOf(account2.address);
    //         chai.expect(WBTCBalance2).to.be.equal(BigInt(2) * big18);

    //         await WBTC.connect(account2).approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         await vBTC.connect(account2).mint(WBTCBalance2);
    //         let vBTCBalance2 = await vBTC.balanceOf(account2.address);
    //         chai.expect(vBTCBalance2).to.be.equal(WBTCBalance2);
    //         chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);


    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         chai.expect(WBTCBalance).to.be.equal(BigInt(97) * big18);


    //         let vTotalSupply = await vBTC.totalSupply();
    //         let cashAmount = await vBTC.getCash();
    //         let borrowAmount = await vBTC.totalBorrows();
    //         let exchangeRate = await vBTC.exchangeRateStored();
    //         let reserveAmount = await vBTC.totalReserves();
    //         chai.expect(vTotalSupply).to.be.equal(WBTCBalance1 + WBTCBalance2);
    //         chai.expect(exchangeRate).to.be.equal(big18); //exchangeRate is 
    //         chai.expect(cashAmount).to.be.equal(WBTCBalance1 + WBTCBalance2);
    //         chai.expect(borrowAmount).to.be.equal(0);
    //         chai.expect(reserveAmount).to.be.equal(0);
    //         chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount);
    //     });


    //     it("Redeem vBTC success", async () => {
    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         let half = WBTCBalance / 2n;
    //         await vBTC.mint(half);
    //         let vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance).to.be.equal(half);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half);

    //         let redeemAmount = half / 2n;
    //         await vBTC.redeem(redeemAmount);
    //         let vBTCBalance2 = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance2).to.be.equal(half - redeemAmount);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half + redeemAmount);
    //     });

    //     it("Transfer vBTC and Redeem vBTC by other success", async () => {
    //         let WBTCBalance = await WBTC.balanceOf(signer.address);
    //         await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
    //         let half = WBTCBalance / 2n;
    //         await vBTC.mint(half);
    //         let vBTCBalance = await vBTC.balanceOf(signer);
    //         chai.expect(vBTCBalance).to.be.equal(half);
    //         chai.expect(await WBTC.balanceOf(signer.address)).to.be.equal(half);

    //         await vBTC.transfer(account1.address, half);
    //         let vBTCBalance1 = await vBTC.balanceOf(account1.address);
    //         chai.expect(vBTCBalance1).to.be.equal(half);
    //         chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(0);
    //         chai.expect(await vBTC.balanceOf(signer)).to.be.equal(0);

    //         await vBTC.connect(account1).redeem(half);
    //         chai.expect(await vBTC.balanceOf(account1.address)).to.be.equal(0);
    //         chai.expect(await WBTC.balanceOf(account1.address)).to.be.equal(half);
    //     });
    // });


    // describe("list markets", () => {

    //     it("list markets with no supply", async () => {
    //         let allMarkets = await Comptroller.getAllMarkets();  //列出所有市場

    //         let assets = new Array(allMarkets.length);
    //         let symbols = new Array(allMarkets.length);
    //         let totalSupply = BigInt(0);
    //         for (let i = 0; i < allMarkets.length; i++) {
    //             let vToken = await ethers.getContractAt("BEP20Harness", allMarkets[i]);
    //             let vTotalSupply = await vToken.totalSupply();

    //             vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
    //             let cashAmount = await vToken.getCash();
    //             let borrowAmount = await vToken.totalBorrows();
    //             let exchangeRate = await vToken.exchangeRateStored();
    //             let reserveAmount = await vToken.totalReserves();

    //             let underlying = await vToken.underlying();
    //             let token = await ethers.getContractAt("BEP20Harness", underlying);
    //             let symbol = await token.symbol();

    //             chai.expect(vTotalSupply).to.be.equal(0);
    //             chai.expect(exchangeRate).to.be.equal(big26 || big18);
    //             chai.expect(cashAmount).to.be.equal(0);
    //             chai.expect(borrowAmount).to.be.equal(0);
    //             chai.expect(reserveAmount).to.be.equal(0);
    //             chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

    //             let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
    //             let price = await oracle.getUnderlyingPrice(allMarkets[i]);
    //             // console.log("price", price);
    //             assets[i] = vTotalSupply * exchangeRate * price;
    //             symbols[i] = symbol;
    //         }

    //         for (let i = 0; i < allMarkets.length; i++) {
    //             // console.log(symbols[i], assets[i]);
    //             totalSupply += assets[i];
    //         }

    //         chai.expect(totalSupply).to.be.equal(0);
    //         // console.log("totalSupply", totalSupply);
    //     });


    //     it("list markets with supply", async () => {
    //         let allMarkets = Array.from(await Comptroller.getAllMarkets()); //列出所有市場
    //         await Comptroller.enterMarkets(allMarkets);    //进入所有市场

    //         let assets = new Array(allMarkets.length);
    //         let symbols = new Array(allMarkets.length);
    //         let totalSupply = BigInt(0);
    //         for (let i = 0; i < allMarkets.length; i++) {
    //             let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[i]);
    //             let underlying = await vToken.underlying();
    //             let token = await ethers.getContractAt("BEP20Harness", underlying);
    //             let balance = await token.balanceOf(signer.address);
    //             let symbol = await token.symbol();

    //             await token.approve(await vToken.getAddress(), balance);
    //             await vToken.mint(balance);
    //             let vTotalSupply = await vToken.totalSupply();

    //             let cashAmount = await vToken.getCash();
    //             let borrowAmount = await vToken.totalBorrows();
    //             let exchangeRate = await vToken.exchangeRateStored();
    //             let reserveAmount = await vToken.totalReserves();

    //             chai.expect(vTotalSupply).to.be.equal(balance);
    //             chai.expect(exchangeRate).to.be.equal(big18);
    //             chai.expect(cashAmount).to.be.equal(balance);
    //             chai.expect(borrowAmount).to.be.equal(0);
    //             chai.expect(reserveAmount).to.be.equal(0);
    //             chai.expect(vTotalSupply * exchangeRate / big18).to.be.equal(cashAmount + borrowAmount - reserveAmount); //if totalSupply == 0,  exchangeRate = 1e18, else exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

    //             let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
    //             let price = await oracle.getUnderlyingPrice(allMarkets[i]);
    //             // console.log("price", price);
    //             assets[i] = vTotalSupply * exchangeRate * price / (big18 * big18 * big18);
    //             symbols[i] = symbol;
    //         }

    //         for (let i = 0; i < allMarkets.length; i++) {
    //             // console.log(symbols[i], assets[i]);
    //             totalSupply += assets[i];
    //         }
    //         // 跳过
    //         // chai.expect(totalSupply).to.be.equal(29700000n);
    //         // console.log("totalSupply", totalSupply);
    //     });

    // });
    describe("mint and repay VAI", () => {
        it("mint and repay VAI", async () => {
            await Comptroller.enterMarkets([await vBTC.getAddress(), await vETH.getAddress()]);
            const markets = await Comptroller.getAssetsIn(signer.address);
            chai.expect(markets).to.be.deep.equal([await vBTC.getAddress(), await vETH.getAddress()]);
            let WBTCBalance = await WBTC.balanceOf(signer.address);
            await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.mint(1e8);
            // await ETH.approve(await vETH.getAddress(), ethers.MaxUint256);
            // console.log("ETH balance", await ETH.balanceOf(signer.address));
            // const ressult = await vETH.mint(big18);
            console.log("vETH balance", await vETH.balanceOf(signer.address));
            console.log("ETH balance after", await ETH.balanceOf(signer.address));
            let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
            chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail
            console.log("mintableAmount", mintableAmount);
            let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
            let price = await oracle.getUnderlyingPrice(await vETH.getAddress());
            console.log("price", price);
            [, collateralFactor,] = await Comptroller.markets(await vETH.getAddress());
            chai.expect(mintableAmount).to.be.equal(big8 * price * collateralFactor / (big18 * big18));

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

        // it("mint VAI more than liquidity ", async () => {
        //     await Comptroller.enterMarkets([await vBTC.getAddress()]);
        //     const markets = await Comptroller.getAssetsIn(signer.address);
        //     chai.expect(markets).to.be.deep.equal([await vBTC.getAddress()]);
        //     let WBTCBalance = await WBTC.balanceOf(signer.address);
        //     await WBTC.approve(await vBTC.getAddress(), ethers.MaxUint256);
        //     await vBTC.mint(WBTCBalance);

        //     let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
        //     chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail

        //     await VAI.approve(await VaiInstance.getAddress(), ethers.MaxUint256);

        //     await VaiInstance.mintVAI(mintableAmount + 1n);

        //     let VAIbalance = await VAI.balanceOf(signer.address);
        //     let totalSupply = await VAI.totalSupply();
        //     let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        //     chai.expect(VAIbalance).to.be.equal(0);
        //     chai.expect(totalSupply).to.be.equal(0);
        //     chai.expect(repayAmount).to.be.equal(0);
        // });



        // it("repay VAI more than self minted", async () => {
        //     let WBTCBalance = await WBTC.balanceOf(signer.address);
        //     await WBTC.transfer(account1.address, WBTCBalance);
        //     let WBTCBalance1 = await WBTC.balanceOf(account1.address);
        //     chai.expect(WBTCBalance1).to.be.equal(WBTCBalance);

        //     //signer enters usdc market and mint VAI
        //     await Comptroller.enterMarkets([await vUSDC.getAddress()]);
        //     let USDCBalance = await USDC.balanceOf(signer.address);
        //     await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
        //     await vUSDC.mint(USDCBalance);
        //     [, liquidity,] = await Comptroller.getAccountLiquidity(signer.address);
        //     chai.expect(liquidity).to.be.equal(8000000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n

        //     let mintAmount = liquidity;
        //     await VaiInstance.mintVAI(mintAmount);
        //     let VAIbalance = await VAI.balanceOf(signer.address);
        //     let totalSupply = await VAI.totalSupply();
        //     let repayAmount = await VaiInstance.getVAIRepayAmount(signer.address);
        //     chai.expect(VAIbalance).to.be.equal(mintAmount);
        //     chai.expect(totalSupply).to.be.equal(mintAmount);
        //     chai.expect(repayAmount).to.be.equal(mintAmount);

        //     //account1 enters BTC market and mint VAI
        //     await Comptroller.connect(account1).enterMarkets([await vBTC.getAddress()]);
        //     await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
        //     await vBTC.connect(account1).mint(WBTCBalance);
        //     [, liquidity1, shortfall1] = await Comptroller.getAccountLiquidity(account1.address);
        //     chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
        //     chai.expect(shortfall1).to.be.equal(0);

        //     let mintAmount1 = liquidity1;
        //     await VaiInstance.connect(account1).mintVAI(mintAmount1);
        //     let VAIbalance1Before = await VAI.balanceOf(account1.address);
        //     totalSupply = await VAI.totalSupply();
        //     let repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
        //     chai.expect(VAIbalance1Before).to.be.equal(mintAmount1);
        //     chai.expect(totalSupply).to.be.equal(mintAmount1 + mintAmount);
        //     chai.expect(repayAmount1).to.be.equal(mintAmount1);

        //     //signer transfer 1e^-18 vai to account1
        //     await VAI.transfer(account1.address, 1n);
        //     let VAIbalance1After = await VAI.balanceOf(account1.address);
        //     totalSupply = await VAI.totalSupply();
        //     repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
        //     chai.expect(VAIbalance1After).to.be.equal(mintAmount1 + 1n);
        //     chai.expect(totalSupply).to.be.equal(mintAmount1 + mintAmount);
        //     chai.expect(repayAmount1).to.be.equal(mintAmount1);

        //     //account1 repay 1e^-18 vai 
        //     await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
        //     await VaiInstance.connect(account1).repayVAI(VAIbalance1After);

        //     VAIbalance1After = await VAI.balanceOf(account1.address);
        //     totalSupply = await VAI.totalSupply();
        //     repayAmount1 = await VaiInstance.getVAIRepayAmount(account1.address);
        //     chai.expect(VAIbalance1After).to.be.equal(1n);
        //     chai.expect(totalSupply).to.be.equal(mintAmount);
        //     chai.expect(repayAmount1).to.be.equal(0);

        // });
    });
});