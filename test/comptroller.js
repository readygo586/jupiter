
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");


describe("Comptroller", () => {

    let Comptroller, vUSDT, vUSDC, USDT, USDC, VAI, VaiInstance;
    let signer;

    before(async function () {
        [signer] = await ethers.getSigners();
        const { comptroller, vTokenInstanceUSDT, vTokenInstanceUSDC, vai, vaiInstance } = await deployVai();
        Comptroller = comptroller;
        vUSDT = vTokenInstanceUSDT;
        vUSDC = vTokenInstanceUSDC;
        VAI = vai;
        VaiInstance = vaiInstance;
        USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
        USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());
    });
    it("check Balance", async () => {
        const USDCBalance = await USDC.balanceOf(signer.address);
        const USDTBalance = await USDT.balanceOf(signer.address);
        chai.expect(USDCBalance).to.be.equal(USDTBalance);
        chai.expect(USDCBalance).to.be.equal(BigInt(10) ** BigInt(25));
    });


    it("check Mint USDC", async () => {
        const USDCBalance = await USDC.balanceOf(signer.address);
        await USDC.approve(await vUSDC.getAddress(), USDCBalance);
        await vUSDC.mint(BigInt(10) ** BigInt(18));
        const vUSDCBalance = await vUSDC.balanceOf(signer);
        chai.expect(vUSDCBalance).to.be.equal(BigInt(10) ** BigInt(18));
    });

    it("check Redeem USDC", async () => {
        const vUSDCBalance = await vUSDC.balanceOf(signer);
        await vUSDC.redeem(vUSDCBalance);
        const USDCBalance = await USDC.balanceOf(signer.address);
        chai.expect(USDCBalance).to.be.equal(BigInt(10) ** BigInt(25));
    });

    it("check Mint USDT", async () => {
        const USDTBalance = await USDT.balanceOf(signer.address);
        await USDT.approve(await vUSDT.getAddress(), USDTBalance);
        await vUSDT.mint(BigInt(10) ** BigInt(18));
        const vUSDTBalance = await vUSDT.balanceOf(signer);
        chai.expect(vUSDTBalance).to.be.equal(BigInt(10) ** BigInt(18));
    });

    it("check Redeem USDT", async () => {
        const vUSDTBalance = await vUSDT.balanceOf(signer);
        await vUSDT.redeem(vUSDTBalance);
        const USDTBalance = await USDT.balanceOf(signer.address);
        chai.expect(USDTBalance).to.be.equal(BigInt(10) ** BigInt(25));
    });

    it("Enter markets", async () => {
        await Comptroller.enterMarkets([await vUSDT.getAddress(), await vUSDC.getAddress()]);
        const markets = await Comptroller.getAssetsIn(signer.address);
        chai.expect(markets).to.be.deep.equal([await vUSDT.getAddress(), await vUSDC.getAddress()]);
        await vUSDT.mint(BigInt(100) * BigInt(10) ** BigInt(18));
        await vUSDC.mint(BigInt(100) * BigInt(10) ** BigInt(18));
    });

    it("check Accrue Interest", async () => {
        const result = await VaiInstance.mintVAI(BigInt(10) ** BigInt(18));
        console.log(result)
        console.log(await VAI.balanceOf(signer.address));
    });

})