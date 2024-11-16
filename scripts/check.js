const { ethers } = require("hardhat");
async function main() {

    const VAI = await ethers.getContractFactory("VAIController");
    const vToken = await ethers.getContractFactory("VBep20Delegator");
    const vUSDC = vToken.attach("0x7c5F282fBa8CA5604780D41c865aC91556A5194E");
    const vUSDT = vToken.attach("0x884dE94167428912Ee674Bffff227F7557b78a6E");
    const vai = VAI.attach("0x38134DA29Cd0d2Bf8fecA7D0B6eD1393bED87b0d");
    const comptroller = await ethers.getContractAt("Comptroller", "0xff39E4832a4ef1633d0202b60480494F65c815FB");
    console.log("USDT Address:", await vUSDT.underlying());
    console.log("USDC Address:", await vUSDC.underlying());

    const USDT = await ethers.getContractAt("BEP20Harness", await vUSDT.underlying());
    const USDC = await ethers.getContractAt("BEP20Harness", await vUSDC.underlying());

    // await sleep(5000);
    // await USDT.approve(await vUSDT.getAddress(), BigInt(10) ** BigInt(25), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await USDC.approve(await vUSDC.getAddress(), BigInt(10) ** BigInt(25), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await vUSDT.mint(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    // await sleep(5000);
    // await vUSDC.mint(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
    await comptroller.enterMarkets([await vUSDT.getAddress(), await vUSDC.getAddress()], { gasLimit: "0x1000000" });
    await sleep(5000);
    await vai.mintVAI(BigInt(100) * BigInt(10) ** BigInt(18), { gasLimit: "0x1000000" });
}
main().catch(console.error);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}