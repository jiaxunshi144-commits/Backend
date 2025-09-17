// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * GreenToken (GT) - ESG 激励代币
 * - 标准 ERC20，企业合格时发放
 * - 只有 Governance 合约（授权后）能 mint
 */
contract GreenToken is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterSet(address indexed minter, bool allowed);

    constructor() ERC20("GreenToken", "GT") Ownable(msg.sender) {}

    modifier onlyMinter() {
        require(minters[msg.sender], "not authorized to mint");
        _;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
