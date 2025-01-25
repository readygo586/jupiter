const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_with_DChain");


async function main() {
    await deployVai();
}


main().catch(console.error);