// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ESG Governance Base Contract (MVP0)
/// @notice 合约底座：提供报告存证、查询、防重复、事件
contract ESGGovernance {
    struct Report {
        address company;   // 提交企业地址
        string hash;       // 文件哈希（前端生成，传入）
        uint timestamp;    // 提交时间
    }

    // 存储所有已提交的报告哈希
    mapping(string => Report) private reports;

    // 事件：当报告被注册时触发
    event ReportRegistered(address indexed company, string hash, uint timestamp);

    /// @notice 提交报告哈希
    /// @param hash 文件哈希（sha256/keccak256，需和前端一致）
    function registerContent(string calldata hash) external {
        require(bytes(hash).length > 0, "Hash cannot be empty");
        require(reports[hash].timestamp == 0, "Already registered");

        reports[hash] = Report(msg.sender, hash, block.timestamp);

        emit ReportRegistered(msg.sender, hash, block.timestamp);
    }

    /// @notice 验证报告是否存在
    /// @param hash 文件哈希
    /// @return exists 是否已存在
    /// @return company 提交者地址
    /// @return timestamp 提交时间
    function verifyContent(string calldata hash) 
        external 
        view 
        returns (bool exists, address company, uint timestamp) 
    {
        if (reports[hash].timestamp > 0) {
            return (true, reports[hash].company, reports[hash].timestamp);
        } else {
            return (false, address(0), 0);
        }
    }
}
