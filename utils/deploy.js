const { ethers, network } = require("hardhat");
const big17 = BigInt(10) ** BigInt(17);
const big18 = BigInt(10) ** BigInt(18);
async function deployComptroller() {
    const [signer] = await ethers.getSigners();
    const UnitrollerFactory = await ethers.getContractFactory("Unitroller");
    const unitroller = await UnitrollerFactory.deploy();
    await unitroller.waitForDeployment();
    console.log("Unitroller deployed to:", await unitroller.getAddress());

    const ComptrollerFactory = await ethers.getContractFactory("Comptroller");
    const _comptroller = await ComptrollerFactory.deploy();
    await _comptroller.waitForDeployment();
    console.log("Comptroller deployed to:", await _comptroller.getAddress());
    await unitroller._setPendingImplementation(await _comptroller.getAddress());
    await _comptroller._become(await unitroller.getAddress());

    const comptroller = await ethers.getContractAt("Comptroller", await unitroller.getAddress());

    const comptrollerLens = await ethers.getContractFactory("ComptrollerLens");
    const comptrollerLensInstance = await comptrollerLens.deploy();
    await comptrollerLensInstance.waitForDeployment();

    const accessControl = await ethers.getContractFactory("AccessControlManager");
    const accessControlInstance = await accessControl.deploy();
    await accessControlInstance.waitForDeployment();

    const mockPriceOracle = await ethers.getContractFactory("SimplePriceOracle");
    const mockPriceOracleInstance = await mockPriceOracle.deploy();
    await mockPriceOracleInstance.waitForDeployment();

    await comptroller._setComptrollerLens(await comptrollerLensInstance.getAddress());
    await comptroller._setAccessControl(await accessControlInstance.getAddress());
    await comptroller._setPriceOracle(await mockPriceOracleInstance.getAddress());
    // Set close factor to 50%
    await comptroller._setCloseFactor(big17 * (5n));

    // Set liquidation incentive to 0%
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setLiquidationIncentive(uint256)`, signer);
    await comptroller._setLiquidationIncentive(big18);


    return { unitroller, comptroller, accessControlInstance, mockPriceOracleInstance }
}

async function deployVToken() {
    const [signer] = await ethers.getSigners();
    const { unitroller, comptroller, accessControlInstance, mockPriceOracleInstance } = await deployComptroller();

    const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n);
    await interestRateModelInstance.waitForDeployment();

    const BEP20Harness = await ethers.getContractFactory("BEP20Harness");
    const USDT = await BEP20Harness.deploy(BigInt(10) ** BigInt(25), "USDT", 18, "USDT");
    await USDT.waitForDeployment();

    const vTokenDelegateUSDT = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceUSDT = await vTokenDelegateUSDT.deploy();
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
        "0x"
    );
    await vTokenInstanceUSDT.waitForDeployment();

    const USDC = await BEP20Harness.deploy(BigInt(10) ** BigInt(25), "USDC", 18, "USDC");
    await USDC.waitForDeployment();

    const vTokenDelegateUSDC = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceUSDC = await vTokenDelegateUSDC.deploy();
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
        "0x"
    );
    await vTokenInstanceUSDC.waitForDeployment();
    await mockPriceOracleInstance.setUnderlyingPrice(await vTokenInstanceUSDT.getAddress(), BigInt(10) ** BigInt(18));
    await mockPriceOracleInstance.setUnderlyingPrice(await vTokenInstanceUSDC.getAddress(), BigInt(10) ** BigInt(18));
    // await mockPriceOracleInstance.setUnderlyingPrice(await USDC.getAddress(), BigInt(10) ** BigInt(18));
    // await mockPriceOracleInstance.setUnderlyingPrice(await USDT.getAddress(), BigInt(10) ** BigInt(18));

    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_supportMarket(address)`, signer);
    await comptroller._supportMarket(await vTokenInstanceUSDT.getAddress());
    await comptroller._supportMarket(await vTokenInstanceUSDC.getAddress());
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setMarketSupplyCaps(address[],uint256[])`, signer);
    await comptroller._setMarketSupplyCaps([await vTokenInstanceUSDT.getAddress(), await vTokenInstanceUSDC.getAddress()], [BigInt(10) ** BigInt(25), BigInt(10) ** BigInt(25)]);
    // _setMarketBorrowCaps
    return { USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller };
}

async function deployVai() {
    const [signer] = await ethers.getSigners();
    const { USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller } = await deployVToken();
    const VAI = await ethers.getContractFactory("VAI");
    const vai = await VAI.deploy(network.config.chainId);
    await vai.waitForDeployment();

    const VaiUnitrollerFactory = await ethers.getContractFactory("VAIUnitroller");
    const vaiUnitroller = await VaiUnitrollerFactory.deploy();
    await vaiUnitroller.waitForDeployment();

    const VaiComptrollerFactory = await ethers.getContractFactory("VAIController");
    const vaiComptroller = await VaiComptrollerFactory.deploy();
    await vaiComptroller.waitForDeployment();

    await vaiUnitroller._setPendingImplementation(await vaiComptroller.getAddress());
    await vaiComptroller._become(await vaiUnitroller.getAddress());

    const vaiInstance = await ethers.getContractAt("VAIController", await vaiComptroller.getAddress());
    await vaiInstance._setComptroller(await comptroller.getAddress());
    await vaiInstance.setVAIAddress(await vai.getAddress());
    await vaiInstance.initialize();
    await comptroller._setVAIController(await vaiInstance.getAddress());
    await vai.rely(await vaiInstance.getAddress());

    return {
        USDT, vTokenInstanceUSDT, USDC, vTokenInstanceUSDC, comptroller, vai, vaiInstance
    }

}

module.exports = { deployComptroller, deployVToken, deployVai }