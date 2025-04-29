const { testComptroller, addVTokenWithDeploy,addVTokenWithoutDeploy, testVDTT} = require("../utils/add_vtoken_on_dtt_testnet");


async function main() {
    await addVTokenWithoutDeploy();
}


main().catch(console.error);