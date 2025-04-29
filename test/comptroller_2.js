
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");
const { int } = require("hardhat/internal/core/params/argumentTypes");



describe("Comptroller_2", () => {

    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance, oracle;
    let signer, account1, account2;
    const big18 = BigInt(10) ** BigInt(18);
    const big17 = BigInt(10) ** BigInt(17);
    const big16 = BigInt(10) ** BigInt(16);
    const big15 = BigInt(10) ** BigInt(15);

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


    describe("repay with APY= 10%", async () => {
        beforeEach(async function () {
            let WBTCBalance = await WBTC.balanceOf(signer.address);    //??
            await WBTC.transfer(account1.address, WBTCBalance);
            let WBTCBalance1 = await WBTC.balanceOf(account1.address);
            chai.expect(WBTCBalance1).to.be.equal(WBTCBalance);

            //signer enters usdc market and mint VAI
            await Comptroller.enterMarkets([await vUSDC.getAddress()]);
            let USDCBalance = await USDC.balanceOf(signer.address);
            await USDC.approve(await vUSDC.getAddress(), ethers.MaxUint256);
            await vUSDC.mint(USDCBalance);
            [, liquidity,] = await Comptroller.getAccountLiquidity(signer.address);
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
            await Comptroller.connect(account1).enterMarkets([await vBTC.getAddress()]);
            await WBTC.connect(account1).approve(await vBTC.getAddress(), ethers.MaxUint256);
            await vBTC.connect(account1).mint(WBTCBalance);  //只借出80%
            [, liquidity1, shortfall1] = await Comptroller.getAccountLiquidity(account1.address);
            chai.expect(liquidity1).to.be.equal(6790000000000000000000000n);  // liqidity provided by vUSDC= 8000000000000000000000000n
            chai.expect(shortfall1).to.be.equal(0);
        });

        it("用户借VAI，第1次1万，1年后第2次借1万，2年后第3次借1万", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(2));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            console.log("*************第3次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(3));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            console.log("-----------------------------------------------------------");
        });

        it("用户借1万VAI，1年后全额归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            let totalSupplyBefore = await VAI.totalSupply();
            console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
            console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

            let blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            let blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍

            //signer给account1转2000VAI
            await VAI.transfer(account1.address, BigInt(2000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);


            await VaiInstance.connect(account1).repayVAI(VAIbalance1);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1- repayAmount1After, big15);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount1After-mintAmount1, big15);
            console.log("--5:repay后，receiver Balance", VAIBalance2);
            console.log("-----------------------------------------------------------");
        });

        it("用户借1万VAI，1年后部分归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");

            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);


            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            let totalSupplyBefore = await VAI.totalSupply();
            console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
            console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

            let blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            let blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍

            //signer给account1转2000VAI
            await VAI.transfer(account1.address, BigInt(2000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);
            let repayAmount = mintAmount1;
            await VaiInstance.connect(account1).repayVAI(repayAmount);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount , big15);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount/BigInt(11), big15);
            console.log("--5:repay后，receiver Balance", VAIBalance2);
            console.log("-----------------------------------------------------------");
        });


        it("用户借VAI，第1次1万，1年后第2次借1万，然后立即全额归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(2));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            //signer给account1转20000VAI
            await VAI.transfer(account1.address, BigInt(20000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);
            let repayAmountBefore = await VaiInstance.getVAIRepayAmount(account1.address);
            console.log("--3.5:转账后，用户 repayAmount", repayAmountBefore);
            await VaiInstance.connect(account1).repayVAI(VAIbalance1);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmountBefore, big15);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmountBefore - mintAmount1*BigInt(2), big15);

            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.equal(0);

            console.log("-----------------------------------------------------------");
        });

        it("用户借VAI，第1次1万，1年后第2次借1万, 然后立即部分归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            console.log("*************第2次mint**************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(2));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            //signer给account1转20000VAI
            await VAI.transfer(account1.address, BigInt(10000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);
            let repayAmountBefore = await VaiInstance.getVAIRepayAmount(account1.address);
            console.log("--3.5:转账后，用户 repayAmount", repayAmountBefore);
            let repayAmount = BigInt(20000)*big18;
            await VaiInstance.connect(account1).repayVAI(repayAmount);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount, big15);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount*(repayAmountBefore - mintAmount1*BigInt(2))/repayAmountBefore, big15);


            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.closeTo(repayAmountBefore - repayAmount, big15);

            console.log("-----------------------------------------------------------");
        });

        it("用户借VAI，第1次1万，1年后第2次借1万，2年后第3次借1万, 然后立即全额归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(2));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            console.log("*************第3次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(3));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            //signer给account1转20000VAI
            await VAI.transfer(account1.address, BigInt(20000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);
            let repayAmountBefore = await VaiInstance.getVAIRepayAmount(account1.address);
            console.log("--3.5:转账后，用户 repayAmount", repayAmountBefore);
            let repayAmount = repayAmountBefore
            await VaiInstance.connect(account1).repayVAI(repayAmount + BigInt(10)*big18);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount, big15);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmountBefore - mintAmount1*BigInt(3), big15);

            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.equal(0);

            console.log("-----------------------------------------------------------");
        });


        it("用户借VAI，第1次1万，1年后第2次借1万，2年后第3次借1万, 然后立即部分归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");
            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);
            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(2));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            console.log("*************第3次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

                let blkNumber1 = await ethers.provider.getBlockNumber();
                await network.provider.send("hardhat_mine", ["0xA06680"]);
                let blkNumber2 = await ethers.provider.getBlockNumber();
                chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
                await VaiInstance.accrueVAIInterest(); //update the interest
                let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
                console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
                repayAmount1Before = repayAmount1After;

                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.equal(mintAmount1*BigInt(3));
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

                let pastInterest = await  VaiInstance.pastVAIInterest(account1.address);
                chai.expect(pastInterest).to.be.equal(repayAmount1After-VAIbalance1);
            }

            //signer给account1转20000VAI
            await VAI.transfer(account1.address, BigInt(20000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);
            let repayAmountBefore = await VaiInstance.getVAIRepayAmount(account1.address);
            console.log("--3.5:转账后，用户 repayAmount", repayAmountBefore);
            let repayAmount = mintAmount1*BigInt(3)
            await VaiInstance.connect(account1).repayVAI(repayAmount);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount, big15);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount*(repayAmountBefore - repayAmount)/repayAmountBefore, big15);

            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.closeTo(repayAmountBefore - repayAmount, big15);

            console.log("-----------------------------------------------------------");
        });

        it("用户借1万VAI，1年后部分归还(本金+利息), 然后再次借1万VAI，再经过1年后全部归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");

            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);


            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            let totalSupplyBefore = await VAI.totalSupply();
            console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
            console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

            let blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            let blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍

            let repayAmount = mintAmount1;
            await VaiInstance.connect(account1).repayVAI(repayAmount);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount , big15);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);

            let VAIBalance2 = await VAI.balanceOf(account2.address);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount/BigInt(11), big15);
            console.log("--5:repay后，receiver Balance", VAIBalance2);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:用户mint之前，用户要还的SAI", repayAmount1Before);
                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.closeTo(mintAmount1 + VAIBalance1After,big15);
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

            }

            blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            // chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
            repayAmount1Before = repayAmount1After;

            //signer给account1转2000VAI
            await VAI.transfer(account1.address, BigInt(20000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);

            repayAmount = repayAmount1Before
            await VaiInstance.connect(account1).repayVAI(repayAmount + BigInt(10)*big18);

            VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount, big15);

            VAIBalance2 = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2);
            chai.expect(VAIBalance2).to.be.closeTo(repayAmount - mintAmount1, big15);

            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.equal(0);

            console.log("-----------------------------------------------------------");
        });


        it("用户借1万VAI，1年后部分归还(本金+利息), 然后再次借1万VAI，再经过1年后部分归还(本金+利息)", async () => {
            console.log("-----------------------------------------------------------");

            await VaiInstance.setReceiver(account2.address);
            await VAI.connect(account1).approve(await VaiInstance.getAddress(), ethers.MaxUint256);


            await VaiInstance.setBaseRate(big17);  //10% APY

            let repayRate = await VaiInstance.getVAIRepayRate();
            chai.expect(repayRate).to.be.equal(big17);
            let repayRatePerBlock = await VaiInstance.getVAIRepayRatePerBlock();
            console.log("--1:每个区块的利息", repayRatePerBlock)


            let mintAmount1 = BigInt(10000)*big18;
            await VaiInstance.connect(account1).mintVAI(mintAmount1);
            let VAIbalance1 = await VAI.balanceOf(account1.address);
            totalSupply = await VAI.totalSupply();
            let repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(VAIbalance1).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(mintAmount1);
            chai.expect(repayAmount1Before).to.be.equal(VAIbalance1);

            let totalSupplyBefore = await VAI.totalSupply();
            console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
            console.log("--2:计算利息之前，用户要还的SAI", repayAmount1Before);

            let blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            let blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            let repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍

            let repayAmount = mintAmount1;
            await VaiInstance.connect(account1).repayVAI(repayAmount);

            let VAIBalance1After = await VAI.balanceOf(account1.address);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount , big15);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);

            let VAIBalance2Before = await VAI.balanceOf(account2.address);
            chai.expect(VAIBalance2Before).to.be.closeTo(repayAmount/BigInt(11), big15);
            console.log("--5:repay后，receiver Balance", VAIBalance2Before);

            console.log("*************第2次mint **************");
            {
                repayAmount1Before = await VaiInstance.getVAIRepayAmount(account1.address);

                let totalSupplyBefore = await VAI.totalSupply();
                console.log("--1.5:用户mint之前，VAI的totalSupply", totalSupplyBefore);
                console.log("--2:用户mint之前，用户要还的SAI", repayAmount1Before);
                await VaiInstance.connect(account1).mintVAI(mintAmount1);

                VAIbalance1 = await VAI.balanceOf(account1.address);
                chai.expect(VAIbalance1).to.be.closeTo(mintAmount1 + VAIBalance1After,big15);
                console.log("--3:用户mint之后，账户中有的VAI", VAIbalance1)

                let totalSupplyAfter = await VAI.totalSupply();
                chai.expect(totalSupplyAfter).to.be.equal(totalSupplyBefore+mintAmount1);
                console.log("--4:用户mint之后，VAI的totalSupply", totalSupplyAfter)
                repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
                chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before + mintAmount1, big15);
                console.log("--5:用户mint之后，用户要还的SAI", repayAmount1After)

                let mintedVAIAmount = await Comptroller.mintedVAIs(account1.address);
                console.log("--6:用户mint之后，记录的mintedVAIAmount",mintedVAIAmount);
                chai.expect(mintedVAIAmount).to.be.equal(repayAmount1After);

            }

            blkNumber1 = await ethers.provider.getBlockNumber();
            await network.provider.send("hardhat_mine", ["0xA06680"]);
            blkNumber2 = await ethers.provider.getBlockNumber();
            chai.expect(blkNumber2).to.be.equal(blkNumber1 + 10512000);
            await VaiInstance.accrueVAIInterest(); //update the interest
            repayAmount1After = await VaiInstance.getVAIRepayAmount(account1.address);
            // chai.expect(repayAmount1After).to.be.closeTo(repayAmount1Before*BigInt(11)/BigInt(10), big15);
            console.log("--2:一年之后，用户要还的SAI", repayAmount1After) //repayAmount1After 大约为 repayAmount1Before 的1.1倍
            repayAmount1Before = repayAmount1After;

            //signer给account1转2000VAI
            await VAI.transfer(account1.address, BigInt(20000)*big18);
            VAIbalance1 = await VAI.balanceOf(account1.address);
            console.log("--3:转账后，用户VAI Balance", VAIbalance1);

            repayAmount = mintAmount1
            await VaiInstance.connect(account1).repayVAI(mintAmount1);


            VAIBalance1After = await VAI.balanceOf(account1.address);
            console.log("--4:repay后，用户VAI Balance", VAIBalance1After);
            chai.expect(VAIBalance1After).to.be.closeTo(VAIbalance1-repayAmount, big15);



            let VAIBalance2After = await VAI.balanceOf(account2.address);
            console.log("--5:repay后，receiver VAI Balance", VAIBalance2After);
            chai.expect(VAIBalance2After).to.be.equal(BigInt(1893313747823194813880n));

            let repayAmountAfter = await VaiInstance.getVAIRepayAmount(account1.address);
            chai.expect(repayAmountAfter).to.be.closeTo(repayAmount1Before - repayAmount, big15);

            console.log("-----------------------------------------------------------");
        });
    });


});