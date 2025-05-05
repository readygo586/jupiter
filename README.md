
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
- fill the parametes in utils/add_vtoken_xx.js
```js
//parameters from deployed
const UnitrollerAddress =  "0xF44ed242f05936D26Df0a817D081E99dB6ae0A0A"  //must be unitriller address
const PriceOracleAddress = "0x88895d3Ce1Eba5C626a853C9c8959aDB4d7d5A89"
const accessControlAddress = "0xF82447441206A306083Dc6dbfCf0C52d5e4Ee267"

//parameters from underlying token
const DttAddress = "0xff75f1c2feEca297a5F091CAd08404dBf74EA389"  //dDTT 的地址
const DttFeeder = "0x919c511bce9565e6a223c5284e02749df980c3d9" // dDTTFeeder 的地址
const underlyingTokenName = "dDTT";
const underlyingTokenSymbol = "dDTT";
const underlyingTokenDecimals = 18;

//parameters for vToken
const vTokenName = "vDTT";
const vTokenSymbol = "vDTT";
const vTokenDecimals = 8;
const exchangeRateDecimal = 18 + underlyingTokenDecimals - vTokenDecimals;
const exchangeRate = BigInt(10) ** BigInt(exchangeRateDecimal);
const collateralFactor = big17 * 6n;
const supplyCap = BigInt(10) ** BigInt(28);

```
-run script to add a token
```sh
npx hardhat run --network xxx scripts/addToken.js
```
