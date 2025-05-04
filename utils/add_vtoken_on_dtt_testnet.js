const { ethers, network } = require("hardhat");
const chai = require("chai");

const big17 = BigInt(10) ** BigInt(17);
const big18 = BigInt(10) ** BigInt(18);
const big16 = BigInt(10) ** BigInt(16);
const big26 = BigInt(10) ** BigInt(26);
const big28 = BigInt(10) ** BigInt(28);

const UnitrollerAddress =  "0xF44ed242f05936D26Df0a817D081E99dB6ae0A0A"
const PriceOracleAddress = "0x88895d3Ce1Eba5C626a853C9c8959aDB4d7d5A89"
const accessControlAddress = "0xF82447441206A306083Dc6dbfCf0C52d5e4Ee267"

const DttAddress = "0xff75f1c2feEca297a5F091CAd08404dBf74EA389"  //dDTT 的地址
const DttFeeder = "0x919c511bce9565e6a223c5284e02749df980c3d9" // dDTTFeeder 的地址
const vBTCAddress   = "0xb32a7c2317F1a0B4F4C057ee6fcBD7B3143bd385"
const underlyingTokenName = "dDTT";
const underlyingTokenSymbol = "dDTT";
const underlyingTokenDecimals = 18;
const vTokenName = "vDTT";
const vTokenSymbol = "vDTT";
const vTokenDecimals = 8;
const exchangeRateDecimal = 18 + underlyingTokenDecimals - vTokenDecimals;
const exchangeRate = BigInt(10) ** BigInt(exchangeRateDecimal);
const collateralFactor = big17 * 6n;
const supplyCap = BigInt(10) ** BigInt(28);

let vDTTAddress = "0x16BF6f88D1732844c6322304f9b7C30Ddc4E1552"//result after deploy vDTT

const delay = 500;

async function testComptroller() {
    const [signer] = await ethers.getSigners();
    console.log(signer.address)
    const unitroller = await ethers.getContractAt("Unitroller", UnitrollerAddress);
    const comptroller = await ethers.getContractAt("Comptroller", UnitrollerAddress);
    const accessControl = await ethers.getContractAt("AccessControlManager", accessControlAddress);
    const oracle = await ethers.getContractAt("Oracle", PriceOracleAddress);

    let valid = await comptroller.isComptroller();
    console.log(valid);

   let allMarkets = await comptroller.getAllMarkets();
   console.log(allMarkets);

    let price = await oracle.getUnderlyingPrice(vBTCAddress)
    console.log(price);

    let admin = await unitroller.admin();
    console.log(admin);

}

//0x16BF6f88D1732844c6322304f9b7C30Ddc4E1552
async function addVTokenWithDeploy() {
    const [signer] = await ethers.getSigners();
    console.log(signer.address)

    // const unitroller = await ethers.getContractAt("Unitroller", UnitrollerAddress);
    const comptroller = await ethers.getContractAt("Comptroller", UnitrollerAddress);
    const accessControl = await ethers.getContractAt("AccessControlManager", accessControlAddress);
    const oracle = await ethers.getContractAt("Oracle", PriceOracleAddress);

    const interestRateModel = await ethers.getContractFactory("WhitePaperInterestRateModel");
    const interestRateModelInstance = await interestRateModel.deploy(big18 * 2n, big18 * 10n);
    await interestRateModelInstance.waitForDeployment();
    await sleep(delay);

    const vTokenDelegate = await ethers.getContractFactory("VBep20Delegate");
    const vTokenDelegateInstance = await vTokenDelegate.deploy();
    await vTokenDelegateInstance.waitForDeployment();
    await sleep(delay);

    const vToken = await ethers.getContractFactory("VBep20Delegator");
    const vTokenInstance = await vToken.deploy(
        DttAddress,
        await comptroller.getAddress(),
        await interestRateModelInstance.getAddress(),
        exchangeRate,
        vTokenName,
        vTokenSymbol,
        8,
        signer.address,
        await vTokenDelegateInstance.getAddress(),
        "0x"
    );

    await vTokenInstance.waitForDeployment();
    await sleep(delay);
    console.log("vDTT deployed to:", await vTokenInstance.getAddress());

    await oracle.updateFeeder(await vTokenInstance.getAddress(), DttFeeder);
    await sleep(delay);
    console.log("updateFeeder");

    await comptroller._supportMarket(await vTokenInstance.getAddress(),{ gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_supportMarket");

    await comptroller._setCollateralFactor(await vTokenInstance.getAddress(), collateralFactor, { gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("finish collateralFactor");

    await comptroller._setMarketSupplyCaps([await vTokenInstance.getAddress()], [supplyCap],{ gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_setMarketSupplyCaps");

    await comptroller._setActionsPaused([await vTokenInstance.getAddress()], [2], true, { gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_setActionsPaused");
}


async function addVTokenWithoutDeploy() {
    const [signer] = await ethers.getSigners();
    console.log("signer", signer.address)

    // const unitroller = await ethers.getContractAt("Unitroller", UnitrollerAddress);
     const comptroller = await ethers.getContractAt("Comptroller",  UnitrollerAddress);
    // const accessControl = await ethers.getContractAt("AccessControlManager", accessControlAddress);
     const oracle = await ethers.getContractAt("Oracle", PriceOracleAddress);


    let vDTT = await ethers.getContractAt("VBep20Delegator", vDTTAddress);
    let symbol = await vDTT.symbol();
    let name = await vDTT.name();
    let decimal = await vDTT.decimals();
    let underlying = await vDTT.underlying();
    let isVToken = await vDTT.isVToken();
    console.log("vDTT", "address", vDTTAddress, "symbol", symbol, "name", name, "decimal", decimal, "underlying", underlying, "isVToken", isVToken);

    let price = await oracle.getUnderlyingPrice(vDTTAddress);
    console.log("vDTT underlying price", price);


    await comptroller._setCollateralFactor(vDTTAddress, collateralFactor, { gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_setCollateralFactor");

    [isListed, collateralFactorMantissa,] = await comptroller.markets(vDTTAddress);
    chai.expect(isListed).to.be.equal(true);
    chai.expect(collateralFactorMantissa).to.be.equal(collateralFactor);

    console.log("collateralFactorMantissa", collateralFactorMantissa )


    await comptroller._setMarketSupplyCaps([vDTTAddress], [supplyCap],{ gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_setMarketSupplyCaps");

    await comptroller._setActionsPaused([vDTTAddress], [2], true, { gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_setActionsPaused");

    await comptroller._supportMarket(vDTTAddress,{ gasLimit: "0x1000000" });
    await sleep(delay);
    console.log("_supportMarket");
}



async function testDeployedVToken() {
    const [signer] = await ethers.getSigners();
    console.log("signer", signer.address)

    // const unitroller = await ethers.getContractAt("Unitroller", UnitrollerAddress);
    const comptroller = await ethers.getContractAt("Comptroller", UnitrollerAddress);
    // const accessControl = await ethers.getContractAt("AccessControlManager", accessControlAddress);
    const oracle = await ethers.getContractAt("Oracle", PriceOracleAddress);

    let vDTT = await ethers.getContractAt("VBep20Delegator", vDTTAddress);
    let symbol = await vDTT.symbol();
    let name = await vDTT.name();
    let decimal = await vDTT.decimals();
    let underlying = await vDTT.underlying();
    console.log("vDTT", "address", vDTTAddress, "symbol", symbol, "name", name, "decimal", decimal, "underlying", underlying);

    let price = await oracle.getUnderlyingPrice(vDTTAddress);
    console.log("vDTT underlying price", price);

    [isListed, collateralFactorMantissa, isVenus] = await comptroller.markets(vDTTAddress);
    console.log("isListed", isListed, "collateralFactorMantissa", collateralFactorMantissa)

    let supplyCap  = await comptroller.supplyCaps(vDTTAddress);
    console.log("supplyCap", supplyCap);

    let isPaused = await comptroller.actionPaused(vDTTAddress, 2);
    console.log("isPaused", isPaused);

    // comptroller._setCollateralFactor(vDTTAddress, collateralFactor, { gasLimit: "0x1000000" });
    // await comptroller._setCollateralFactor(vDTTAddress, collateralFactor, { gasLimit: "0x1000000" });
    // await sleep(delay);
    // console.log("_setCollateralFactor");
    //
    // await comptroller._setMarketSupplyCaps([vDTTAddress], [supplyCap],{ gasLimit: "0x1000000" });
    // await sleep(delay);
    // console.log("_setMarketSupplyCaps");
    //
    // await comptroller._setActionsPaused([vDTTAddress], [2], true, { gasLimit: "0x1000000" });
    // await sleep(delay);
    // console.log("_setActionsPaused");
    //
    // await comptroller._supportMarket(vDTTAddress,{ gasLimit: "0x1000000" });
    // await sleep(delay);
    // console.log("_supportMarket");
}


async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {testComptroller, addVTokenWithDeploy,addVTokenWithoutDeploy, testDeployedVToken}