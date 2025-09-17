const { ethers } = require("ethers");
require("dotenv").config(); // 用 .env 里的 PRIVATE_KEY / ALCHEMY_API_KEY / CONTRACT_ADDRESS

async function main() {
  // 连接 provider & wallet
  const provider = new ethers.JsonRpcProvider(
    `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // 合约信息
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contractABI = [
    "function registerContent(bytes32 hash) external",
    "function verifyContent(bytes32 hash) external view returns (bool)"
  ];
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);

  // 🔑 测试 hash （随便一个固定值）
  // 0x + 64 个 1
  const testHash = "0x" + "1".repeat(64);

  console.log("👤 Wallet address:", wallet.address);
  console.log("📄 Testing registerContent with hash:", testHash);

  try {
    const tx = await contract.registerContent(testHash);
    console.log("⏳ Sent tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Success! Mined in block", receipt.blockNumber);
  } catch (err) {
    console.error("❌ Error:", err);
  }

  // 顺便查一下是否已注册
  try {
    const exists = await contract.verifyContent(testHash);
    console.log("🔍 verifyContent result:", exists);
  } catch (err) {
    console.error("❌ Verify error:", err);
  }
}

main();
