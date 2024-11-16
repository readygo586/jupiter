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
      accounts: [`a8e4e54a851b23a3f53fceb29524c78ca18d0b2bbca39d8c9f4ad5eb8e68e5f8`],
      gas: 10000000,
    }
  }
};
