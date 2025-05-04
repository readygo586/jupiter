const { testComptroller, addVTokenWithDeploy,addVTokenWithoutDeploy, testDeployedVToken} = require("../utils/add_vtoken_on_dtt_testnet");


async function main() {
    await testDeployedVToken();
}


main().catch(console.error);