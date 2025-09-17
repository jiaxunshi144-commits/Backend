// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * GreenToken (GT) - ESG 激励代币
 * - 标准 ERC20
 * - 部署时绑定 ESGGovernance 地址，自动授权为 minter
 */
contract GreenToken is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterSet(address indexed minter, bool allowed);

    modifier onlyMinter() {
        require(minters[msg.sender], "not authorized to mint");
        _;
    }

    /// @param governanceAddr ESGGovernance 合约地址
    constructor(address governanceAddr) ERC20("GreenToken", "GT") Ownable(msg.sender) {
        require(governanceAddr != address(0), "invalid governance");
        minters[governanceAddr] = true;
        emit MinterSet(governanceAddr, true);
    }

    /// owner 仍然可以修改授权
    function setMinter(address minter, bool allowed) external onlyOwner {
        require(minter != address(0), "zero address");
        minters[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    /// 只有已授权的合约能 mint
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
