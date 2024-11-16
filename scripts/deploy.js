const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy");


async function main() {
    await deployVai();
}


main().catch(console.error);