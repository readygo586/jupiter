import { ethers } from 'hardhat';



async function main() {
    const [deployer, userA] = await ethers.getSigners();
    const comptroller = await deployComptroller(deployer, overrides);
    console.log('#1 Comptroller Deployed at: ', comptroller.address);
}


main().catch(console.error);