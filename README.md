
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
