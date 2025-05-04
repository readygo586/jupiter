const { ethers } = require("ethers");

const UnitrollerAddress =  "0xF44ed242f05936D26Df0a817D081E99dB6ae0A0A"
const ComptrollerAddress = "0xbec90Af7e2376806f1a3d508be065B1B51d2DD4D"
// const vDTTAddress = "0x2570B96925BD811940EB3C431715E8439c348991";

async function main() {
    // await checkChainIdAndBlockNumber();
    // await checkIsMarketSupport();
     await printFailReason();
}

main().catch(console.error);

async function printFailReason(){
    console.log("printFailReason for 0x8183853c97330261c7737ef5f614a207b23684080f36a84a9818702dc3585c71")
    const txHash = "0x8183853c97330261c7737ef5f614a207b23684080f36a84a9818702dc3585c71";

    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const tx = await provider.getTransaction(txHash);

    console.log("Tx to:", tx.to);
    console.log("Tx data:", tx.data);

    try {
        const result = await provider.call({
            to: tx.to,
            from: tx.from,
            data: tx.data,
            value: tx.value,
        }, tx.blockNumber);

        console.log("Call result (success):", result);
    } catch (e) {
        console.error("Call failed. Revert reason:", e.message || e);
    }
}

async function checkChainIdAndBlockNumber() {
    console.log("checkIsMarketSupport")
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");

    try {
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();

        console.log("Chain ID:", network.chainId);
        console.log("Current block number:", blockNumber);
    } catch (err) {
        console.error("Failed to fetch network info:", err.message || err);
    }
}

async function checkIsMarketSupport() {
    console.log("checkIsMarketSupport")
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");

    //TODO,检查0xF44ed242f05936D26Df0a817D081E99dB6ae0A0A是否是合约
    // 检查 UnitrollerAddress 是否是合约
    try {
        const code = await provider.getCode(UnitrollerAddress);
        if (code === "0x") {
            console.log(`${UnitrollerAddress} is not a contract.`);
        } else {
            console.log(`${UnitrollerAddress} is a contract.`);
        }
    } catch (err) {
        console.error("Failed to check code at address:", err.message || err);
    }


    // const ComptrollerABI = [
    //     "function markets(address) view returns (bool isListed, uint collateralFactorMantissa, bool isVenus)"
    // ];
    //
    // const comptroller = new ethers.Contract(UnitrollerAddress, ComptrollerABI, provider);
    // try {
    //     const market = await comptroller.markets(vDTTAddress);
    //     console.log(`Market info for ${vDTTAddress}:`);
    //     console.log("  isListed:", market.isListed);
    //     console.log("  collateralFactorMantissa:", market.collateralFactorMantissa.toString());
    //     console.log("  isVenus:", market.isVenus);
    // } catch (err) {
    //     console.error("Failed to check market:", err.message || err);
    // }

    // const ERC20ABI = [
    //     "function symbol() view returns (string)",
    //     "function name() view returns (string)",
    //     "function decimals() view returns (uint8)",
    //     "function totalSupply() view returns (uint256)"
    // ];
    //
    // const vToken = new ethers.Contract(vDTTAddress, ERC20ABI, provider);
    // try {
    //     const [symbol, name, decimals, totalSupply] = await Promise.all([
    //         vToken.symbol(),
    //         vToken.name(),
    //         vToken.decimals(),
    //         vToken.totalSupply(),
    //     ]);
    //
    //     console.log("vToken Info:");
    //     console.log("  name:", name);
    //     console.log("  symbol:", symbol);
    //     console.log("  decimals:", decimals);
    //     console.log("  totalSupply:", totalSupply.toString());
    // } catch (err) {
    //     console.error("Failed to fetch ERC20 info:", err.message || err);
    // }
}


