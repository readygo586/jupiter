const { ethers, network } = require("hardhat");
const big17 = BigInt(10) ** BigInt(17);
const big18 = BigInt(10) ** BigInt(18);
const big16 = BigInt(10) ** BigInt(16);
const big26 = BigInt(10) ** BigInt(26);
const big28 = BigInt(10) ** BigInt(28);

let BTCAdderss = `0xac2ceee60e79f572cae3d2ea9c1c7f0b03934f5e`
let ETHAddress = `0x4354230038d0C3120B8756f1AbA72E9F4FC94979`
let BTCFeeder = `0x33deb1bCDCC9ecc2056F87A20CFF3dcBd54a37f6`
let ETHFeeder = `0x11ffA6965b4c25790980897241100dA23b87C7f2`

const delay = 2000;
const needDeployToken = false;
const needDeployPriceOracle = false;
const needConsoleLog = true;
async function deployComptroller() {
    const [signer] = await ethers.getSigners();
    const UnitrollerFactory = await ethers.getContractFactory("Unitroller");
    const unitroller = await UnitrollerFactory.deploy();
    await unitroller.waitForDeployment();
    if (needConsoleLog) { console.log("Unitroller deployed to:", await unitroller.getAddress()); }

    await sleep(delay);
    const ComptrollerFactory = await ethers.getContractFactory("Comptroller");
    const _comptroller = await ComptrollerFactory.deploy();
    await _comptroller.waitForDeployment();
    await sleep(delay);
    let comptrollerAddress= await _comptroller.getAddress();
    if (needConsoleLog) { console.log("Comptroller deployed to:", comptrollerAddress); }
    await unitroller._setPendingImplementation(comptrollerAddress);
    await sleep(delay);

    let unitrollerAddress = await unitroller.getAddress();
    await sleep(delay);
    await _comptroller._become(unitrollerAddress);
    await sleep(delay);

    const comptroller = await ethers.getContractAt("Comptroller", await unitroller.getAddress());
    const comptrollerLens = await ethers.getContractFactory("ComptrollerLens");
    const comptrollerLensInstance = await comptrollerLens.deploy();
    await comptrollerLensInstance.waitForDeployment();
    await sleep(delay);

    const accessControl = await ethers.getContractFactory("AccessControlManager");
    const accessControlInstance = await accessControl.deploy();
    await accessControlInstance.waitForDeployment();
    await sleep(delay);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setLiquidationIncentive(uint256)`, signer);
    await sleep(delay);
    let PriceOracleInstance;
    if (!needDeployPriceOracle) {
        const PriceOracle = await ethers.getContractFactory("Oracle");
        PriceOracleInstance = await PriceOracle.deploy();
        await PriceOracleInstance.waitForDeployment();
        await sleep(delay);
    } else {
        const mockPriceOracle = await ethers.getContractFactory("SimplePriceOracle");
        PriceOracleInstance = await mockPriceOracle.deploy();
        await PriceOracleInstance.waitForDeployment();
    }
    // setFeed
    await comptroller._setComptrollerLens(await comptrollerLensInstance.getAddress());
    await sleep(delay);
    await comptroller._setAccessControl(await accessControlInstance.getAddress());
    await sleep(delay);
    await comptroller._setPriceOracle(await PriceOracleInstance.getAddress());
    await sleep(delay);
    // Set close factor to 50%
    await comptroller._setCloseFactor(big17 * (5n));
    await sleep(delay);

    // Set liquidation incentive to 105%
    await comptroller._setLiquidationIncentive((big18 + big16 * 5n));
    await sleep(delay);

    return { unitroller, comptroller, accessControlInstance, PriceOracleInstance }
}

async function deployVToken() {
    const [signer] = await ethers.getSigners();
    const { unitroller, comptroller, accessControlInstance, PriceOracleInstance } = await deployComptroller();

    if (needDeployToken) {
        const BEP20 = await ethers.getContractFactory("BEP20Harness");
        const BEP20BTC = await BEP20.deploy(BigInt(10) ** BigInt(20), "Wrapped BTC", 8, "WBTC");
        await BEP20BTC.waitForDeployment();
        await sleep(delay);
        BTCAdderss = await BEP20BTC.getAddress();

        const BEP20ETH = await BEP20.deploy(BigInt(10) ** BigInt(20), "Wrapped ETH", 18, "WETH");
        await BEP20ETH.waitForDeployment();
        await sleep(delay);
        ETHAddress = await BEP20ETH.getAddress();
    }

    const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n);
    await interestRateModelInstance.waitForDeployment();
    await sleep(delay);

    const vTokenDelegateBTC = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceBTC = await vTokenDelegateBTC.deploy();
    await vTokenDelegateInstanceBTC.waitForDeployment();
    await sleep(delay);
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
    await sleep(delay);

    const vTokenDelegateETH = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstanceETH = await vTokenDelegateETH.deploy();
    await vTokenDelegateInstanceETH.waitForDeployment();
    await sleep(delay);
    const vTokenETH = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstanceETH = await vTokenETH.deploy(
        ETHAddress,
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        BigInt(10) ** BigInt(28),
        "vETH",
        "vETH",
        8,
        signer.address,
        await vTokenDelegateInstanceETH.getAddress(),
        "0x"
    );
    await vTokenInstanceETH.waitForDeployment();
    await sleep(delay);
    if (!needDeployPriceOracle) {
        await PriceOracleInstance.updateFeeder(await vTokenInstanceBTC.getAddress(), BTCFeeder);
        await sleep(delay);
        await PriceOracleInstance.updateFeeder(await vTokenInstanceETH.getAddress(), ETHFeeder);
        await sleep(delay);
    } else {
        await PriceOracleInstance.setUnderlyingPrice(await vTokenInstanceBTC.getAddress(), 96981920000000000000000n);
        await sleep(delay);
        await PriceOracleInstance.setUnderlyingPrice(await vTokenInstanceETH.getAddress(), 3355980000000000000000n);
        await sleep(delay);
    }


    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_supportMarket(address)`, signer);
    await sleep(delay);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setMarketSupplyCaps(address[],uint256[])`, signer);
    await sleep(delay);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setCollateralFactor(address,uint256)`, signer);
    await sleep(delay);
    await accessControlInstance.giveCallPermission(await comptroller.getAddress(), `_setActionsPaused(address[],uint256[],bool)`, signer);
    await sleep(delay);
    await comptroller._supportMarket(await vTokenInstanceBTC.getAddress());
    await sleep(delay);
    await comptroller._supportMarket(await vTokenInstanceETH.getAddress());
    await sleep(delay);
    await comptroller._setCollateralFactor(await vTokenInstanceBTC.getAddress(), big17 * 8n);
    await sleep(delay);
    await comptroller._setCollateralFactor(await vTokenInstanceETH.getAddress(), big17 * 8n);
    await sleep(delay);

    await comptroller._setMarketSupplyCaps([await vTokenInstanceBTC.getAddress(), await vTokenInstanceETH.getAddress()], [BigInt(10) ** BigInt(35), BigInt(10) ** BigInt(35)]);
    // _setMarketBorrowCaps

    await sleep(delay);
    if (needConsoleLog) { console.log("price oracle deployed to:", await PriceOracleInstance.getAddress()); }

    await sleep(delay);
    if (needConsoleLog) { console.log("access control deployed to:", await accessControlInstance.getAddress()); }
    await sleep(delay);
    return { vTokenInstanceBTC, vTokenInstanceETH, comptroller, PriceOracleInstance };

}

async function deployVai() {
    const [signer] = await ethers.getSigners();
    const { vTokenInstanceBTC, vTokenInstanceETH, comptroller, PriceOracleInstance } = await deployVToken();
    const VAI = await ethers.getContractFactory("VAI");
    const vai = await VAI.deploy(network.config.chainId);
    await vai.waitForDeployment();
    await sleep(delay);

    const VaiUnitrollerFactory = await ethers.getContractFactory("VAIUnitroller");
    const vaiUnitroller = await VaiUnitrollerFactory.deploy();
    await vaiUnitroller.waitForDeployment();
    await sleep(delay);

    const VaiComptrollerFactory = await ethers.getContractFactory("VAIController");
    const vaiComptroller = await VaiComptrollerFactory.deploy();
    await vaiComptroller.waitForDeployment();
    await sleep(delay);

    await vaiUnitroller._setPendingImplementation(await vaiComptroller.getAddress(),  { gasLimit: "0x1000000" });
    await sleep(delay);
    await vaiComptroller._become(await vaiUnitroller.getAddress(),  { gasLimit: "0x1000000" });


    const vaiInstance = await ethers.getContractAt("VAIController", await vaiUnitroller.getAddress());
    await sleep(delay);
    await vaiInstance._setComptroller(await comptroller.getAddress(), { gasLimit: "0x1000000" });
    await sleep(delay);
    await vaiInstance.setVAIAddress(await vai.getAddress(),  { gasLimit: "0x1000000" });
    await sleep(delay);
    await vaiInstance.initialize();
    await sleep(delay);
    await comptroller._setVAIController(await vaiInstance.getAddress(),  { gasLimit: "0x1000000" });
    await sleep(delay);
    await comptroller._setVAIMintRate(10000);
    await sleep(delay);
    await vai.rely(await vaiInstance.getAddress());
    await comptroller._setActionsPaused([await vTokenInstanceBTC.getAddress(), await vTokenInstanceETH.getAddress()], [2], true);

    if (needConsoleLog) {
        console.log("VAI deployed to:", await vai.getAddress());
        console.log("VAIController deployed to:", await vaiInstance.getAddress());
        console.log("vUBTC deployed to:", await vTokenInstanceBTC.getAddress());
        console.log("vETH deployed to:", await vTokenInstanceETH.getAddress());
    }



    return {
        vTokenInstanceETH, vTokenInstanceBTC, comptroller, vai, vaiInstance, PriceOracleInstance
    }
}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { deployComptroller, deployVToken, deployVai }