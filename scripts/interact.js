async function main() {
  const contractAddress = "0xcf32C17016FC006a364a2e10dDa660B65caAFcA1";

  const GAB = await ethers.getContractFactory("GAB");
  const gab = await ethers.getContractAt("GAB", contractAddress);

  // 1. 写入一个哈希
  const tx = await gab.registerContent("test123hash");
  await tx.wait();
  console.log("✅ 已登记哈希 test123hash");

  // 2. 读取哈希
  const [uploader, timestamp] = await gab.verifyContent("test123hash");
  console.log("📌 上传者:", uploader);
  console.log("📌 时间戳:", timestamp.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
