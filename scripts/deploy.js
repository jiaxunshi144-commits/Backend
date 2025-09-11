async function main() {
  const GAB = await ethers.getContractFactory("GAB");
  const gab = await GAB.deploy();
  await gab.waitForDeployment();  // ✅ v6 的新函数
  console.log("✅ GAB deployed to:", await gab.getAddress());

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
