const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { ethers } = require("ethers");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Blockchain setup from environment variables
const provider = new ethers.JsonRpcProvider(
  `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [
  "function registerContent(string memory hash) public"
];
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Upload & Register endpoint
app.post("/uploadAndRegister", upload.single("file"), async (req, res) => {
  try {
    // 1. Read file and generate hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // 2. Interact with contract
    try {
      const tx = await contract.registerContent(fileHash);
      await tx.wait();

      // 3. Generate transaction link & QR code
      const transactionLink = `https://amoy.polygonscan.com/tx/${tx.hash}`;
      const qrCodeData = await QRCode.toDataURL(transactionLink);

      // 4. Respond success
      return res.json({
        success: true,
        message: "File successfully registered on blockchain.",
        data: {
          fileHash: fileHash,
          transactionId: tx.hash,
          transactionLink: transactionLink,
          qrCode: qrCodeData
        }
      });
    } catch (err) {
      if (err.reason === "Already registered") {
        return res.json({
          success: false,
          message: "This file has already been registered on blockchain.",
          data: {
            fileHash: fileHash
          }
        });
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error while processing the file.",
      error: err.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
