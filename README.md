# Sample Hardhat Project




Comptroller deployed to: 0x5D1a68c4b37727E21d920211903C4d89CD1ea815
USDT deployed to: 0x4B722153f8581539a57ca3ed77f75cEd33889616
USDC deployed to: 0x127B42a0B65BAAe469A933EA5C317Eb3F7D621EB
price oracle deployed to: 0x388a2a1c44A973fF1b3F4a225750e9AC48Dd5907
access control deployed to: 0x2AD8291624317be8D04AD92394c63fE77DD919b2
VAI deployed to: 0x09F8429f6bC0259d9Cba12A09BB2A1bCE3195d8F
VAIController deployed to: 0x348e334a6253EfC2a12428F180c0861382d5e1C3
vUSDT deployed to: 0x2abf1CF8C5D6a24E765AcB383f78831B5C866E99
vUSDC deployed to: 0x8140143BCa70b64e5981EaC090cF2f2Ac1E8A221
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
 
```js
const { deployComptroller, deployVToken, deployVai } = require("../utils/deploy_on_bsc_testnet");


async function main() {
    await deployVai();
}


main().catch(console.error);
```


## How to add a token in 
