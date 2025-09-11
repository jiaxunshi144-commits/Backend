// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GAB {
    struct Record {
        address uploader;   // 谁登记的
        uint256 timestamp;  // 登记时间
    }

    // 存储文件哈希 -> 对应的记录
    mapping(string => Record) public records;

    // 登记文件哈希
    function registerContent(string memory hash) public {
        require(records[hash].uploader == address(0), "Already registered");
        records[hash] = Record(msg.sender, block.timestamp);
    }

    // 验证文件哈希是否存在
    function verifyContent(string memory hash) public view returns (address, uint256) {
        return (records[hash].uploader, records[hash].timestamp);
    }
}
