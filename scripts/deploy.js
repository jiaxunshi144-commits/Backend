const hre = require("hardhat");

async function main() {
  // 1. 部署 GreenToken
  const GreenToken = await hre.ethers.getContractFactory("GreenToken");
  const greenToken = await GreenToken.deploy();
  await greenToken.waitForDeployment();
  console.log("✅ GreenToken deployed to:", await greenToken.getAddress());

  // 2. 部署 ESGGovernance
  const ESGGovernance = await hre.ethers.getContractFactory("ESGGovernance");
  const governance = await ESGGovernance.deploy();
  await governance.waitForDeployment();
  console.log("✅ ESGGovernance deployed to:", await governance.getAddress());

  // 3. 授权 governance 可以 mint GreenToken
  const tx1 = await greenToken.setMinter(await governance.getAddress(), true);
  await tx1.wait();
  console.log("🔑 Governance authorized as minter");

  // 4. 在 governance 里绑定奖励 token
  const tx2 = await governance.setRewardToken(await greenToken.getAddress());
  await tx2.wait();
  console.log("🔗 Governance linked with GreenToken");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
