const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(
  `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [
  "function registerContent(bytes32 hash) public",
  "event ReportRegistered(bytes32 indexed contentHash, address indexed sender, uint256 timestamp)"
];
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// 模拟 ESG 数据
function generateESGData() {
  return {
    // 环境 E
    carbonEmission: (Math.random() * 100).toFixed(2),    // 吨 CO₂
    electricityUsage: (Math.random() * 500).toFixed(1),  // kWh
    waterUsage: (Math.random() * 200).toFixed(1),        // 立方米
    renewableRatio: (Math.random() * 100).toFixed(1),    // %

    // 社会 S
    complianceRate: (90 + Math.random() * 10).toFixed(1), // % 合规工时
    incidents: Math.floor(Math.random() * 5),             // 安全事故数
    employeeSatisfaction: (50 + Math.random() * 50).toFixed(1), // 满意度

    // 治理 G
    boardAttendance: (70 + Math.random() * 30).toFixed(1), // 董事会出勤率 %
    transparencyScore: (50 + Math.random() * 50).toFixed(1), // 透明度评分
    complianceIssues: Math.floor(Math.random() * 3),        // 违规次数

    timestamp: new Date().toISOString()
  };
}

async function main() {
  setInterval(async () => {
    const data = generateESGData();
    const jsonString = JSON.stringify(data);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));

    console.log("🌍 ESG Data:", data);
    console.log("🔑 Hash:", hash);

    try {
      const tx = await contract.registerContent(hash);
      console.log("⏳ Tx sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Stored on chain in block", receipt.blockNumber);
    } catch (err) {
      console.error("❌ Error storing data:", err.message);
    }
  }, 60000); // 每 1 分钟上链一次
}

main();
