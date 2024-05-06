require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      chainId: 810,
      gas: "auto",
      loggingEnabled: process.env.HARDHAT_LOGGING === "true",
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    version: "0.5.3",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};
