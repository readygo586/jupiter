const { ethers } = require("hardhat");
async function main() {

    const VAI = await ethers.getContractFactory("VAIController");
    const vToken = await ethers.getContractFactory("VBep20Delegator");
    const vUSDC = vToken.attach("0x8140143BCa70b64e5981EaC090cF2f2Ac1E8A221");
    const vUSDT = vToken.attach("0x2abf1CF8C5D6a24E765AcB383f78831B5C866E99");
    const vai = VAI.attach("0x348e334a6253EfC2a12428F180c0861382d5e1C3");
    const comptroller = await ethers.getContractAt("Comptroller", "0x5D1a68c4b37727E21d920211903C4d89CD1ea815");
    console.log("USDT Address:", await vUSDT.underlying());
    console.log("USDC Address:", await vUSDC.underlying());

    const USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
    const USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());

    await sleep(5000);
    // await USDT.approve(await vUSDT.getAddress(), BigInt(10) ** BigInt(25), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await USDC.approve(await vUSDC.getAddress(), BigInt(10) ** BigInt(25), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await vUSDT.mint(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await vUSDC.mint(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await comptroller.enterMarkets([await vUSDT.getAddress(), await vUSDC.getAddress()], { gasLimit: "0x1000000" });
    // await sleep(5000);
    await vai.mintVAI(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
}
main().catch(console.error);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}