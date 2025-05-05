const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");
const { int } = require("hardhat/internal/core/params/argumentTypes");


describe("Comptroller_3", () => {
    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance, oracle;
    let signer, account1, account2;
    const big18 = BigInt(10) ** BigInt(18);
    const big17 = BigInt(10) ** BigInt(17);
    const big16 = BigInt(10) ** BigInt(16);

    beforeEach(async function () {
        [signer, account1, account2, account3] = await ethers.getSigners();
        const {
            comptroller,
            vTokenInstanceUSDT,
            vTokenInstanceUSDC,
            vTokenInstanceBTC,
            vai,
            vaiInstance,
            mockPriceOracleInstance
        } = await deployVai();
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

    describe("add a vToken in market", () => {
        it("add a vToken in market", async () => {
            const underlyingTokenName = "dDTT";
            const underlyingTokenSymbol = "dDTT";
            const underlyingTokenDecimals = 18;
            const vTokenName = "vDTT";
            const vTokenSymbol = "vDTT";
            const vTokenDecimals = 8;

            const exchangeRateDecimal = 18 + underlyingTokenDecimals - vTokenDecimals;
            const exchangeRate = BigInt(10) ** BigInt(exchangeRateDecimal);

            const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
            const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n, { gasLimit: "0x1000000" });
            await interestRateModelInstance.waitForDeployment();

            const BEP20Harness = await ethers.getContractFactory("BEP20Harness");

            //deploy underlying token
            const underlyingToken = await BEP20Harness.deploy(BigInt(10) ** BigInt(25), underlyingTokenName , underlyingTokenDecimals, underlyingTokenSymbol, { gasLimit: "0x1000000" });
            await underlyingToken.waitForDeployment();

            const vTokenDelegate = await ethers.getContractFactory("VBep20Delegate");
            const vTokenDelegateInstance = await vTokenDelegate.deploy({ gasLimit: "0x1000000" });
            await vTokenDelegateInstance.waitForDeployment();


            //deploy vToken
            const vToken = await ethers.getContractFactory("VBep20Delegator");
            const vTokenInstance = await vToken.deploy(
                await underlyingToken.getAddress(),
                await Comptroller.getAddress(),
                await interestRateModelInstance.getAddress(),
                exchangeRate,
                vTokenName,
                vTokenSymbol,
                vTokenDecimals,
                signer.address,
                await vTokenDelegateInstance.getAddress(),
                "0x", { gasLimit: "0x1000000" }
            );
            await vTokenInstance.waitForDeployment();

            let initPrice = (BigInt(20) ** BigInt(16)) * (BigInt(10) ** BigInt(18 - underlyingTokenDecimals));  //price = 0.2 USDT
            await oracle.setUnderlyingPrice(await vTokenInstance.getAddress(), initPrice, { gasLimit: "0x1000000" });

            //await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_supportMarket(address)`, signer, { gasLimit: "0x1000000" });
            await Comptroller._supportMarket(await vTokenInstance.getAddress(), { gasLimit: "0x1000000" });


            //await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setCollateralFactor(address,uint256)`, signer, { gasLimit: "0x1000000" });
            let initCollateralFactor = big17 * 6n;
            await Comptroller._setCollateralFactor(await vTokenInstance.getAddress(), initCollateralFactor, { gasLimit: "0x1000000" });

            //await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setMarketSupplyCaps(address[],uint256[])`, signer, { gasLimit: "0x1000000" });
            let initSupply = BigInt(10) ** BigInt(25);
            await Comptroller._setMarketSupplyCaps([await vTokenInstance.getAddress()], [initSupply], { gasLimit: "0x1000000" });

            // _setMarketBorrowCaps
            //await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setActionsPaused(address[],uint256[],bool)`, signer, { gasLimit: "0x1000000" });
            await Comptroller._setActionsPaused([await vTokenInstance.getAddress()], [2], true);

            let allMarkets = await Comptroller.getAllMarkets();
            chai.expect(allMarkets.length).to.be.equal(4);

            let index = allMarkets.length -1;
            //check underlyingToken's name/symbol/decimal/balance
            {
                let vToken = await ethers.getContractAt("VBep20Delegator", allMarkets[index]);
                let underlying = await vToken.underlying();
                let token = await ethers.getContractAt("BEP20Harness", underlying);
                let balance = await token.balanceOf(signer.address);
                let symbol = await token.symbol();
                let name = await token.name();

                chai.expect(symbol).to.be.equal(underlyingTokenSymbol);
                chai.expect(name).to.be.equal(underlyingTokenName);
                chai.expect(balance).to.be.equal(initSupply);
            }

            //check vToken's name/symbol/decimal/balance
            {
                let vToken = vTokenInstance;
                let name = await vToken.name();
                let symbol = await vToken.symbol();
                let decimals = await vToken.decimals();
                let balance = await vToken.balanceOf(signer.address);

                chai.expect(name).to.be.equal(vTokenName);
                chai.expect(symbol).to.be.equal(vTokenSymbol);
                chai.expect(decimals).to.be.equal(vTokenDecimals);
                chai.expect(balance).to.be.equal(0);
            }

            //check init price
            {
                let price = await oracle.getUnderlyingPrice(allMarkets[index]);
                chai.expect(price).to.be.equal(initPrice);
            }

            //check init collateralFactor
            {
                [, collateralFactorMantissa,] = await Comptroller.markets(allMarkets[index]);
                chai.expect(collateralFactorMantissa).to.be.equal(initCollateralFactor);
            }

            //check init collateralFactor
            {
                let cap = await Comptroller.borrowCaps(allMarkets[index]);
                chai.expect(cap).to.be.equal(0n);

            }

             //mint VAI by collateral vToken
            {
                let vToken = vTokenInstance;
                await Comptroller.enterMarkets([await vToken.getAddress()]);
                const markets = await Comptroller.getAssetsIn(signer.address);
                chai.expect(markets).to.be.deep.equal([await vToken.getAddress()]);
                let underlyingBalance = await underlyingToken.balanceOf(signer.address);
                await underlyingToken.approve(await vToken.getAddress(), ethers.MaxUint256);
                await vToken.mint(underlyingBalance);

                let balance = await vToken.balanceOf(signer.address);
                // console.log("balance", balance, "underlyingBalance", underlyingBalance);
                chai.expect(balance * exchangeRate/big18).to.be.equal(underlyingBalance);

                let [res, mintableAmount] = await VaiInstance.getMintableVAI(signer.address);
                chai.expect(res).to.be.equal(0);  //0 = success, otherwise fail

                let oracle = await ethers.getContractAt("PriceOracle", await Comptroller.oracle());
                let price = await oracle.getUnderlyingPrice(await vToken.getAddress());
                [, collateralFactor,] = await Comptroller.markets(await vToken.getAddress());
                chai.expect(mintableAmount).to.be.equal(balance * exchangeRate * price * collateralFactor / (big18 * big18 * big18));

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

                let redeemVTokenAmount = balance/4n;
                await vToken.redeem(redeemVTokenAmount);

                let remainedVTokenAmount = await vToken.balanceOf(signer.address);
                chai.expect(remainedVTokenAmount).to.be.equal(redeemVTokenAmount * BigInt(3));

                let underlyingBalance2 = await underlyingToken.balanceOf(signer.address);
                chai.expect(underlyingBalance2).to.be.equal(redeemVTokenAmount*exchangeRate/big18);
            }
        });
    });
});