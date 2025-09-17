// ------------------- 基础依赖 -------------------
const express = require("express");
const multer = require("multer");
const { ethers } = require("ethers");
const QRCode = require("qrcode");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ------------------- Express 初始化 -------------------
const app = express();
app.use(cors());
app.use(express.json());

// Multer 上传配置
const upload = multer({ dest: "uploads/" });

// ------------------- 区块链设置 -------------------
const provider = new ethers.JsonRpcProvider(
  `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [
  // MVP1
  "function registerContent(bytes32 hash) public",
  "function verifyContent(bytes32 hash) public view returns (bool)",

  // MVP2
  "function setAuditor(address auditor, bool allowed) public",
  "function attestReport(bytes32 hash, bool passed, string reason) public",
  "function revokeAttestation(bytes32 hash, string reason) public",
  "function getReportStatus(bytes32 hash) public view returns (bool,bool,bool,address,uint64,string)",
  "function getAttestationHistory(bytes32 hash) public view returns (tuple(bool passed,uint64 timestamp,address auditor,string action,string reason)[])"
];
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// ------------------- 辅助函数 -------------------
function computeFileHash(fileBuffer) {
  return ethers.keccak256(fileBuffer); // 返回 bytes32
}

// ------------------- API 路由 -------------------

// 上传并上链
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = computeFileHash(fileBuffer);
    fs.unlinkSync(req.file.path);

    const tx = await contract.registerContent(fileHash);
    await tx.wait();

    const transactionLink = `https://amoy.polygonscan.com/tx/${tx.hash}`;
    const qrCodeData = await QRCode.toDataURL(transactionLink);

    return res.json({
      success: true,
      message: "File successfully registered on blockchain.",
      data: {
        fileHash,
        transactionId: tx.hash,
        transactionLink,
        qrCode: qrCodeData
      }
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 验证存证
app.get("/api/verify/:hash", async (req, res) => {
  try {
    const fileHash = req.params.hash;
    const exists = await contract.verifyContent(fileHash);
    return res.json({ success: true, data: { exists } });
  } catch (err) {
    console.error("❌ Verify error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 审计员背书
app.post("/api/attest", async (req, res) => {
  try {
    const { hash, passed, reason } = req.body;
    const tx = await contract.attestReport(hash, !!passed, reason || "");
    const receipt = await tx.wait();
    res.json({
      success: true,
      message: "Report attested",
      txHash: receipt.transactionHash,
      link: `https://amoy.polygonscan.com/tx/${receipt.transactionHash}`
    });
  } catch (err) {
    console.error("❌ Attest error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 审计员撤销
app.post("/api/revoke", async (req, res) => {
  try {
    const { hash, reason } = req.body;
    const tx = await contract.revokeAttestation(hash, reason || "revoked");
    const receipt = await tx.wait();
    res.json({
      success: true,
      message: "Attestation revoked",
      txHash: receipt.transactionHash,
      link: `https://amoy.polygonscan.com/tx/${receipt.transactionHash}`
    });
  } catch (err) {
    console.error("❌ Revoke error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 报告状态
app.get("/api/status/:hash", async (req, res) => {
  try {
    const status = await contract.getReportStatus(req.params.hash);
    const [
      registered,
      hasAttestation,
      passed,
      auditor,
      timestamp,
      reason
    ] = status;

    res.json({
      success: true,
      data: { registered, hasAttestation, passed, auditor, timestamp, reason }
    });
  } catch (err) {
    console.error("❌ Status error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 背书历史
app.get("/api/history/:hash", async (req, res) => {
  try {
    const history = await contract.getAttestationHistory(req.params.hash);
    res.json({ success: true, history });
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------- 静态文件托管 -------------------
app.use(express.static(path.join(__dirname, "../frontend")));

// ------------------- 启动服务 -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
