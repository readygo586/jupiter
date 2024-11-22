
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");


describe("Comptroller", () => {

    let Comptroller, vUSDT, vUSDC, vBTC, USDT, USDC, WBTC, VAI, VaiInstance;
    let signer;

    before(async function () {
        [signer] = await ethers.getSigners();
        const { comptroller, vTokenInstanceUSDT, vTokenInstanceUSDC, vTokenInstanceBTC,vai, vaiInstance } = await deployVai();
        Comptroller = comptroller;
        vUSDT = vTokenInstanceUSDT;
        vUSDC = vTokenInstanceUSDC;
        vBTC = vTokenInstanceBTC;
        VAI = vai;
        VaiInstance = vaiInstance;
        USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
        USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());
        WBTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    });

    it("check Balance", async () => {
        const USDCBalance = await USDC.balanceOf(signer.address);
        const USDTBalance = await USDT.balanceOf(signer.address);
        const WBTCBalance = await WBTC.balanceOf(signer.address);
        chai.expect(USDCBalance).to.be.equal(USDTBalance);
        chai.expect(USDCBalance).to.be.equal(BigInt(10) ** BigInt(25));
        chai.expect(WBTCBalance).to.be.equal(BigInt(10) ** BigInt(20));
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
        chai.expect(await vUSDT.balanceOf(signer.address)).to.be.equal(BigInt(100) * BigInt(10) ** BigInt(18));
        chai.expect(await vUSDC.balanceOf(signer.address)).to.be.equal(BigInt(100) * BigInt(10) ** BigInt(18));
    });

    it("mint Vai", async () => {
        await VaiInstance.mintVAI(BigInt(100) * BigInt(10) ** BigInt(18));
        chai.expect(await VAI.balanceOf(signer.address)).to.be.equal(BigInt(100) * BigInt(10) ** BigInt(18));
    });
    it("Mint Vai again", async () => {
        await VaiInstance.mintVAI(BigInt(60) * BigInt(10) ** BigInt(18));
        chai.expect(await VAI.balanceOf(signer.address)).to.be.equal(BigInt(100) * BigInt(10) ** BigInt(18));
    });

})