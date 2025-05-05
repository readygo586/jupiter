
## install
```sh
 yarn install 
```

## run test case
run all test case 
```sh
 npx hardhat test
```
run one test case 
```sh
npx hardhat test --grep "repay with APY"
```

## How to deploy
- import different script into scripts/deploy.js
 
```js
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_on_bsc_testnet");


async function main() {
    await deployVai();
}

main().catch(console.error);
```
- deploy
```sh
npx hardhat run --network hardhat scripts/deploy.js
```
the result looks like
```
npx hardhat run --network hardhat scripts/deploy.js
WARNING: You are currently using Node.js v23.11.0, which is not supported by Hardhat. This can lead to unexpected behavior. See https://hardhat.org/nodejs-versions


Unitroller deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Comptroller deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
USDT deployed to: 0x9A676e781A523b5d0C0e43731313A708CB607508
USDC deployed to: 0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
price oracle deployed to: 0x0165878A594ca255338adfa4d48449f69242Eb8F
access control deployed to: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
VAI deployed to: 0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E
VAIController deployed to: 0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690
vUSDT deployed to: 0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
vUSDC deployed to: 0x3Aa5ebB10DC797CAC828524e59A333d0A371443c
```


## How to add a token in 
