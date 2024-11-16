const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_with_delay");


async function main() {
    await deployVai();
}


main().catch(console.error);