const { ethers } = require("hardhat");
async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Signer Address:", await signer.getAddress());
    const VAIController = await ethers.getContractFactory("VAIController");
    const vToken = await ethers.getContractFactory("VBep20Delegator");
    const vBTC = vToken.attach("0xb32a7c2317F1a0B4F4C057ee6fcBD7B3143bd385");
    const vETH = vToken.attach("0x9bB92FaAa31720daCAd4Eaecf53d2d6aCE787E17");
    const vai = await vToken.attach("0x433b1063b0e7675c4e5eb8D2401d3AcC4f46d4fC");
    const vaiController = VAIController.attach("0x842be4E7B33da30Ad7f34bb7B6bF512f234c403a");
    const comptroller = await ethers.getContractAt("Comptroller", "0xF44ed242f05936D26Df0a817D081E99dB6ae0A0A");
    console.log("BTC Address:", await vBTC.underlying());
    console.log("ETH Address:", await vETH.underlying());

    const BTC = await ethers.getContractAt("BEP20Harness", await vBTC.underlying());
    const ETH = await ethers.getContractAt("BEP20Harness", await vETH.underlying());
    // await ETH.approve(await vETH.getAddress(), BigInt(10) ** BigInt(25));
    // await sleep(30000);
    await vETH.mint(BigInt(1) * BigInt(10) ** BigInt(18));
    await sleep(30000);
    console.log("BTC Balance:", await BTC.balanceOf(signer));
    console.log("ETH Balance:", await ETH.balanceOf(signer));
    console.log("vBTC Balance:", await vBTC.balanceOf(signer));
    console.log("vETH Balance:", await vETH.balanceOf(signer));

    // // await ETH.approve(await vETH.getAddress(), BigInt(10) ** BigInt(25));
    // await sleep(30000);
    // await vETH.mint(BigInt(1) * BigInt(10) ** BigInt(18));
    // await sleep(30000);
    // // await comptroller.enterMarkets([await vBTC.getAddress(), await vETH.getAddress()]);
    // // await sleep(30000);
    // const result = await vaiController.mintVAI(BigInt(100) * BigInt(10) ** BigInt(18));
    // console.log("Mint VAI:", result);
    // await sleep(30000);
    // const balanceBTC = await BTC.balanceOf(signer);
    // const balanceVBTC = await vBTC.balanceOf(signer);
    // const balanceETH = await ETH.balanceOf(signer);
    // const balanceVETH = await vETH.balanceOf(signer);
    // const balanceVAI = await vai.balanceOf(signer);
    // console.log("Balance BTC:", balanceBTC);
    // console.log("Balance ETH:", balanceETH);
    // console.log("Balance vBTC:", balanceVBTC);
    // console.log("Balance vETH:", balanceVETH);
    // console.log("Balance VAI:", balanceVAI);
    // const rresult = await vaiController.getMintableVAI(signer);

    // console.log(`VBTC decimals: ${await vBTC.decimals()}`);
    // console.log(`VETH decimals: ${await vETH.decimals()}`);
    // console.log(`VAI decimals: ${await vai.decimals()}`);
    // console.log(`BTC decimals: ${await BTC.decimals()}`);
    // console.log(`ETH decimals: ${await ETH.decimals()}`);
    // await accessControl.giveCallPermission(await comptroller.getAddress(), `_setActionsPaused(address[],uint256[],bool)`, signer);
    // await sleep(30000);
    // const result = await comptroller._setActionsPaused([await vBTC.getAddress(), await vETH.getAddress()], [2], true);
    // console.log("Set Actions Paused:", result);
    // console.log("Mintable VAI:", rresult);

}
main().catch(console.error);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}