const { ethers } = require("hardhat");

async function deployComptroller() {
    const UnitrollerFactory = await ethers.getContractFactory("Unitroller");
    const unitroller = await UnitrollerFactory.deploy();
    await unitroller.waitForDeployment();
    console.log("Unitroller deployed to:", await unitroller.getAddress());

    const ComptrollerFactory = await ethers.getContractFactory("Comptroller");
    const comptroller = await ComptrollerFactory.deploy();
    await comptroller.waitForDeployment();
    console.log("Comptroller deployed to:", await comptroller.getAddress());
    await unitroller._setPendingImplementation(await comptroller.getAddress());
    await comptroller._become(await unitroller.getAddress());

    const comptrollerLens = await ethers.getContractFactory("ComptrollerLens");
    const comptrollerLensInstance = await comptrollerLens.deploy(await unitroller.getAddress());
    


    return { unitroller, comptroller }
}

module.exports = { deployComptroller }