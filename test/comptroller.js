
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken } = require("../utils/deploy");


describe("Comptroller", () => {

    let Comptroller, vUSDT, vUSDC, USDT, USDC;
    let signer;

    before(async function () {
        [signer] = await ethers.getSigners();
        const { comptroller, vTokenInstanceUSDT, vTokenInstanceUSDC } = await deployVToken();
        Comptroller = comptroller;
        vUSDT = vTokenInstanceUSDT;
        vUSDC = vTokenInstanceUSDC;
        USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
        USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());
    });
    it("check Balance", async () => {
        const USDCBalance = await USDC.balanceOf(signer.address);
        const USDTBalance = await USDT.balanceOf(signer.address);
        chai.expect(USDCBalance).to.be.equal(USDTBalance);
        chai.expect(USDCBalance).to.be.equal(BigInt(10) ** BigInt(25));
    });


    it("check Mint", async () => {
        const USDCBalance = await USDC.balanceOf(signer.address);
        await USDC.approve(vUSDC.address, USDCBalance);
        await vUSDC.mint(USDCBalance);
        const vUSDCBalance = await vUSDC.balanceOf(signer.address);
        chai.expect(vUSDCBalance).to.be.equal(USDCBalance);
    });

})