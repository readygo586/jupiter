require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    bsc_testnet: {
      url: "https://bsc-testnet.public.blastapi.io",
      chainId: 97,
      accounts: [`329d45df2086825022b2b648fc39ebc4f3edaa0dac7612af86b923f57fd6e26c`],
      gas: 10000000,
    },
    DT_testnet: {
      url: "http://13.212.23.35:6979",
      chainId: 10086,
      accounts: [`329d45df2086825022b2b648fc39ebc4f3edaa0dac7612af86b923f57fd6e26c`],
    }
  }
};
