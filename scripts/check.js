const { ethers } = require("hardhat");
async function main() {
    const [signer] = await ethers.getSigners();
    const VAIController = await ethers.getContractFactory("VAIController");
    const vToken = await ethers.getContractFactory("VBep20Delegator");
    const vBTC = vToken.attach("0x2E9E2E7233EB78f95CbCb991377A1212309B9acc");
    const vETH = vToken.attach("0x0F4813F10d42924C7085DC324B88235eC914dA16");
    const vai = await vToken.attach("0xaa46Fe4fc775A51117808b85f7b5D974040cdE0e");
    const vaiController = VAIController.attach("0xe30a831334D0e70AFd18b63E3f4B6494f23119Ae");
    const comptroller = await ethers.getContractAt("Comptroller", "0xC13957049cd4560825bf76310D97BC5b2793B7DC");
    console.log("BTC Address:", await vBTC.underlying());
    console.log("ETH Address:", await vETH.underlying());

    const BTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    const ETH = await ethers.getContractAt("BEP20Harness", await vETH.underlying());

    await BTC.approve(await vBTC.getAddress(), BigInt(10) ** BigInt(25));
    await vBTC.mint(BigInt(1) ** BigInt(8));
    await sleep(30000);
    await ETH.approve(await vETH.getAddress(), BigInt(10) ** BigInt(25));
    await sleep(30000);
    await vETH.mint(BigInt(1) ** BigInt(18));
    await sleep(30000);
    await comptroller.enterMarkets([await vBTC.getAddress(), await vETH.getAddress()]);
    await sleep(30000);
    const result = await vaiController.mintVAI(BigInt(100) * BigInt(10) ** BigInt(18));
    console.log("Mint VAI:", result);
    await sleep(30000);
    const balanceVBTC = await vBTC.balanceOf(signer);
    const balanceVETH = await vETH.balanceOf(signer);
    const balanceVAI = await vai.balanceOf(signer);
    console.log("Balance vBTC:", balanceVBTC.toString());
    console.log("Balance vETH:", balanceVETH.toString());
    console.log("Balance VAI:", balanceVAI.toString());

}
main().catch(console.error);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}