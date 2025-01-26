const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_on_bsc_testnet");


async function main() {
    await deployVai();
}


main().catch(console.error);