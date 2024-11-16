const { ethers, network } = require("hardhat");
const big17 = BigInt(10) ** BigInt(17);
const big18 = BigInt(10) ** BigInt(18);
async function deployComptroller() {
    const [signer] = await ethers.getSigners();
    const UnitrollerFactory = await ethers.getContractFactory("Unitroller");
    const unitroller = await UnitrollerFactory.deploy({ gasLimit: "0x1000000" });
    await unitroller.waitForDeployment();
    console.log("Unitroller deployed to:", await unitroller.getAddress());

    const ComptrollerFactory = await ethers.getContractFactory("Comptroller");
    const _comptroller = await ComptrollerFactory.deploy({ gasLimit: "0x1000000" });
    await _comptroller.waitForDeployment();
    console.log("Comptroller deployed to:", await _comptroller.getAddress());
    await unitroller._setPendingImplementation(await _comptroller.getAddress(), { gasLimit: "0x1000000" });

    await sleep(5000);

    await _comptroller._become(await unitroller.getAddress(), { gasLimit: "0x1000000" });

    await sleep(5000);

    const comptroller = await ethers.getContractAt("Comptroller", await unitroller.getAddress());

    const comptrollerLens = await ethers.getContractFactory("ComptrollerLens");
    const comptrollerLensInstance = await comptrollerLens.deploy({ gasLimit: "0x1000000" });
    await comptrollerLensInstance.waitForDeployment();

    const accessControl = await ethers.getContractFactory("AccessControlManager");
    const accessControlInstance = await accessControl.deploy({ gasLimit: "0x1000000" });
    await accessControlInstance.waitForDeployment();

    const mockPriceOracle = await ethers.getContractFactory("SimplePriceOracle");
    const mockPriceOracleInstance = await mockPriceOracle.deploy({ gasLimit: "0x1000000" });
    await mockPriceOracleInstance.waitForDeployment();
    await sleep(5000);

    await comptroller._setComptrollerLens(await comptrollerLensInstance.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setAccessControl(await accessControlInstance.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setPriceOracle(await mockPriceOracleInstance.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    // Set close factor to 50%
    await comptroller._setCloseFactor(big17 * (5n), { gasLimit: "0x1000000" });
    await sleep(5000);

    // Set liquidation incentive to 0%
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setLiquidationIncentive(uint256)`, signer, { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setLiquidationIncentive(big18, { gasLimit: "0x1000000" });
    await sleep(5000);



    return { unitroller, comptroller, accessControlInstance, mockPriceOracleInstance }
}

async function deployVToken() {
    const [signer] = await ethers.getSigners();
    const { unitroller, comptroller, accessControlInstance, mockPriceOracleInstance } = await deployComptroller();

    const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n, { gasLimit: "0x1000000" });
    await interestRateModelInstance.waitForDeployment();

    const BEP20Harness = await ethers.getContractFactory("BEP20Harness");
    const USDT = await BEP20Harness.deploy(BigInt(10) ** BigInt(25), "USDT", 18, "USDT", { gasLimit: "0x1000000" });
    await USDT.waitForDeployment();

    console.log("USDT deployed to:", await USDT.getAddress());

    const vTokenDelegateUSDT = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceUSDT = await vTokenDelegateUSDT.deploy({ gasLimit: "0x1000000" });
    await vTokenDelegateInstanceUSDT.waitForDeployment();

    const vTokenUSDT = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstanceUSDT = await vTokenUSDT.deploy(
        await USDT.getAddress(),
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        big18,
        "vUSDT",
        "vUSDT",
        18,
        signer.address,
        await vTokenDelegateInstanceUSDT.getAddress(),
        "0x", { gasLimit: "0x1000000" }
    );
    await vTokenInstanceUSDT.waitForDeployment();

    const USDC = await BEP20Harness.deploy(BigInt(10) ** BigInt(25), "USDC", 18, "USDC", { gasLimit: "0x1000000" });
    await USDC.waitForDeployment();

    console.log("USDC deployed to:", await USDC.getAddress());

    const vTokenDelegateUSDC = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceUSDC = await vTokenDelegateUSDC.deploy({ gasLimit: "0x1000000" });
    await vTokenDelegateInstanceUSDC.waitForDeployment();

    const vTokenUSDC = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstanceUSDC = await vTokenUSDC.deploy(
        await USDC.getAddress(),
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        big18,
        "vUSDC",
        "vUSDC",
        18,
        signer.address,
        await vTokenDelegateInstanceUSDC.getAddress(),
        "0x", { gasLimit: "0x1000000" }
    );
    await vTokenInstanceUSDC.waitForDeployment();
    await sleep(5000);
    await mockPriceOracleInstance.setUnderlyingPrice(await vTokenInstanceUSDT.getAddress(), BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    await sleep(5000);
    await mockPriceOracleInstance.setUnderlyingPrice(await vTokenInstanceUSDC.getAddress(), BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    await sleep(5000);
    // await mockPriceOracleInstance.setUnderlyingPrice(await USDC.getAddress(), BigInt(10) ** BigInt(18));
    // await mockPriceOracleInstance.setUnderlyingPrice(await USDT.getAddress(), BigInt(10) ** BigInt(18));
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_supportMarket(address)`, signer, { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._supportMarket(await vTokenInstanceUSDT.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._supportMarket(await vTokenInstanceUSDC.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setCollateralFactor(address,uint256)`, signer, { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setCollateralFactor(await vTokenInstanceUSDT.getAddress(), big17 * 8n, { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setCollateralFactor(await vTokenInstanceUSDC.getAddress(), big17 * 8n, { gasLimit: "0x1000000" });
    await sleep(5000);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setMarketSupplyCaps(address[],uint256[])`, signer, { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setMarketSupplyCaps([await vTokenInstanceUSDT.getAddress(), await vTokenInstanceUSDC.getAddress()], [BigInt(10) ** BigInt(25), BigInt(10) ** BigInt(25)], { gasLimit: "0x1000000" });
    // _setMarketBorrowCaps

    await sleep(5000);
    console.log("price oracle deployed to:", await mockPriceOracleInstance.getAddress());
    await sleep(5000);
    console.log("access control deployed to:", await accessControlInstance.getAddress());
    await sleep(5000);
    return { USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller };
}

async function deployVai() {
    const [signer] = await ethers.getSigners();
    const { USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller } = await deployVToken();
    const VAI = await ethers.getContractFactory("VAI");
    const vai = await VAI.deploy(network.config.chainId, { gasLimit: "0x1000000" });
    await vai.waitForDeployment();

    const VaiUnitrollerFactory = await ethers.getContractFactory("VAIUnitroller");
    const vaiUnitroller = await VaiUnitrollerFactory.deploy({ gasLimit: "0x1000000" });
    await vaiUnitroller.waitForDeployment();

    const VaiComptrollerFactory = await ethers.getContractFactory("VAIController");
    const vaiComptroller = await VaiComptrollerFactory.deploy({ gasLimit: "0x1000000" });
    await vaiComptroller.waitForDeployment();

    await vaiUnitroller._setPendingImplementation(await vaiComptroller.getAddress(), { gasLimit: "0x1000000" });
    await vaiComptroller._become(await vaiUnitroller.getAddress(), { gasLimit: "0x1000000" });

    const vaiInstance = await ethers.getContractAt("VAIController", await vaiUnitroller.getAddress());
    await sleep(5000);
    await vaiInstance._setComptroller(await comptroller.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await vaiInstance.setVAIAddress(await vai.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await vaiInstance.initialize({ gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setVAIController(await vaiInstance.getAddress(), { gasLimit: "0x1000000" });
    await sleep(5000);
    await comptroller._setVAIMintRate(10000, { gasLimit: "0x1000000" });
    await sleep(5000);
    await vai.rely(await vaiInstance.getAddress(), { gasLimit: "0x1000000" });

    console.log("VAI deployed to:", await vai.getAddress());
    console.log("VAIController deployed to:", await vaiInstance.getAddress());
    console.log("vUSDT deployed to:", await vTokenInstanceUSDT.getAddress());
    console.log("vUSDC deployed to:", await vTokenInstanceUSDC.getAddress());


    return {
        USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller, vai, vaiInstance
    }

}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { deployComptroller, deployVToken, deployVai }