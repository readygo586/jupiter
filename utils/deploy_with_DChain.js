const { ethers, network } = require("hardhat");
const big17 = BigInt(10) ** BigInt(17);
const big18 = BigInt(10) ** BigInt(18);
const big16 = BigInt(10) ** BigInt(16);

// wBTC: 0x009B327577757e3567483bA3A21576aaeB34D208
// wETH: 0x94D09CE5EDc048ae1fAC368a69466B240623E7fD

const BTCAdderss = `0x009B327577757e3567483bA3A21576aaeB34D208`
const ETHAddress = `0x94D09CE5EDc048ae1fAC368a69466B240623E7fD`
const BTCFeeder = `0x2dd9a1733331e34bbb496d15ac44d8347ef41dd4`
const ETHFeeder = `0x8e4a80185a552cb4752b7d31b787e934b367fcf0`

const chainId = 10086;

async function deployComptroller() {
    const [signer] = await ethers.getSigners();
    const UnitrollerFactory = await ethers.getContractFactory("Unitroller");
    const unitroller = await UnitrollerFactory.deploy();
    await unitroller.waitForDeployment();
    console.log("Unitroller deployed to:", await unitroller.getAddress());
    await sleep(30000);
    const ComptrollerFactory = await ethers.getContractFactory("Comptroller");
    const _comptroller = await ComptrollerFactory.deploy();
    await _comptroller.waitForDeployment();
    await sleep(30000);

    console.log("Comptroller deployed to:", await _comptroller.getAddress());
    await unitroller._setPendingImplementation(await _comptroller.getAddress());
    await sleep(30000);

    await _comptroller._become(await unitroller.getAddress());
    await sleep(30000);

    const comptroller = await ethers.getContractAt("Comptroller", await unitroller.getAddress());
    const comptrollerLens = await ethers.getContractFactory("ComptrollerLens");
    const comptrollerLensInstance = await comptrollerLens.deploy();
    await comptrollerLensInstance.waitForDeployment();
    await sleep(30000);

    const accessControl = await ethers.getContractFactory("AccessControlManager");
    const accessControlInstance = await accessControl.deploy();
    await accessControlInstance.waitForDeployment();
    await sleep(30000);

    const PriceOracle = await ethers.getContractFactory("Oracle");
    const PriceOracleInstance = await PriceOracle.deploy();
    await PriceOracleInstance.waitForDeployment();
    await sleep(30000);
    // setFeed

    await comptroller._setComptrollerLens(await comptrollerLensInstance.getAddress());
    await sleep(30000);
    await comptroller._setAccessControl(await accessControlInstance.getAddress());
    await sleep(30000);
    await comptroller._setPriceOracle(await PriceOracleInstance.getAddress());
    await sleep(30000);
    // Set close factor to 50%
    await comptroller._setCloseFactor(big17 * (6n));
    await sleep(30000);

    // Set liquidation incentive to 105%
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setLiquidationIncentive(uint256)`, signer);
    await sleep(30000);
    await comptroller._setLiquidationIncentive((big18 + big16 * 5n));
    await sleep(30000);

    return { unitroller, comptroller, accessControlInstance, PriceOracleInstance }
}

async function deployVToken() {
    const [signer] = await ethers.getSigners();
    const { unitroller, comptroller, accessControlInstance, PriceOracleInstance } = await deployComptroller();
    const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n);
    await interestRateModelInstance.waitForDeployment();
    await sleep(30000);

    const vTokenDelegateBTC = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceBTC = await vTokenDelegateBTC.deploy();
    await vTokenDelegateInstanceBTC.waitForDeployment();
    await sleep(30000);
    const vTokenBTC = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstanceBTC = await vTokenBTC.deploy(
        BTCAdderss,
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        big18,
        "vBTC",
        "vBTC",
        8,
        signer.address,
        await vTokenDelegateInstanceBTC.getAddress(),
        "0x"
    );
    await vTokenInstanceBTC.waitForDeployment();
    await sleep(30000);

    const vTokenDelegateETH = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceETH = await vTokenDelegateETH.deploy();
    await vTokenDelegateInstanceETH.waitForDeployment();
    await sleep(30000);
    const vTokenETH = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstanceETH = await vTokenETH.deploy(
        ETHAddress,
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        big18,
        "vETH",
        "vETH",
        18,
        signer.address,
        await vTokenDelegateInstanceETH.getAddress(),
        "0x"
    );
    await vTokenInstanceETH.waitForDeployment();
    await sleep(30000);

    await PriceOracleInstance.updateFeeder(await vTokenInstanceBTC.getAddress(), BTCFeeder);
    await sleep(30000);
    await PriceOracleInstance.updateFeeder(await vTokenInstanceETH.getAddress(), ETHFeeder);
    await sleep(30000);

    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_supportMarket(address)`, signer);
    await sleep(30000);
    await comptroller._supportMarket(await vTokenInstanceBTC.getAddress());
    await sleep(30000);
    await comptroller._supportMarket(await vTokenInstanceETH.getAddress());
    await sleep(30000);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setCollateralFactor(address,uint256)`, signer);
    await sleep(30000);
    await comptroller._setCollateralFactor(await vTokenInstanceBTC.getAddress(), big17 * 8n);
    await sleep(30000);
    await comptroller._setCollateralFactor(await vTokenInstanceETH.getAddress(), big17 * 8n);
    await sleep(30000);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setMarketSupplyCaps(address[],uint256[])`, signer);
    await sleep(30000);
    await comptroller._setMarketSupplyCaps([await vTokenInstanceBTC.getAddress(), await vTokenInstanceETH.getAddress()], [BigInt(10) ** BigInt(25), BigInt(10) ** BigInt(25)]);
    // _setMarketBorrowCaps

    await sleep(30000);
    console.log("price oracle deployed to:", await PriceOracleInstance.getAddress());
    await sleep(30000);
    console.log("access control deployed to:", await accessControlInstance.getAddress());
    await sleep(30000);
    return { vTokenInstanceBTC, vTokenInstanceETH, comptroller };

}

async function deployVai() {
    const [signer] = await ethers.getSigners();
    const { vTokenInstanceBTC, vTokenInstanceETH, comptroller } = await deployVToken();
    const VAI = await ethers.getContractFactory("VAI");
    const vai = await VAI.deploy(chainId);
    await vai.waitForDeployment();
    await sleep(30000);

    const VaiUnitrollerFactory = await ethers.getContractFactory("VAIUnitroller");
    const vaiUnitroller = await VaiUnitrollerFactory.deploy();
    await vaiUnitroller.waitForDeployment();
    await sleep(30000);

    const VaiComptrollerFactory = await ethers.getContractFactory("VAIController");
    const vaiComptroller = await VaiComptrollerFactory.deploy();
    await vaiComptroller.waitForDeployment();
    await sleep(30000);

    await vaiUnitroller._setPendingImplementation(await vaiComptroller.getAddress());
    await sleep(30000);
    await vaiComptroller._become(await vaiUnitroller.getAddress());


    const vaiInstance = await ethers.getContractAt("VAIController", await vaiUnitroller.getAddress());
    await sleep(30000);
    await vaiInstance._setComptroller(await comptroller.getAddress());
    await sleep(30000);
    await vaiInstance.setVAIAddress(await vai.getAddress());
    await sleep(30000);
    await vaiInstance.initialize();
    await sleep(30000);
    await comptroller._setVAIController(await vaiInstance.getAddress());
    await sleep(30000);
    await comptroller._setVAIMintRate(10000);
    await sleep(30000);
    await vai.rely(await vaiInstance.getAddress());


    console.log("VAI deployed to:", await vai.getAddress());
    console.log("VAIController deployed to:", await vaiInstance.getAddress());
    console.log("vUBTC deployed to:", await vTokenInstanceBTC.getAddress());
    console.log("vETH deployed to:", await vTokenInstanceETH.getAddress());
}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { deployComptroller, deployVToken, deployVai }