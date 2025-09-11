require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://polygon-amoy.g.alchemy.com/v2/JzFvmuX8GpASCsc8RzY3P",
      accounts: ["0x345285d96a8a03e7e71a150d8228e5e82e5f52e6849844188ec60b9161fb122f"]
    }
  }
};
