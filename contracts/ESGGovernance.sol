// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ESGGovernance (Full)
 * - 存证：bytes32(keccak256) 上链
 * - 审计：白名单审计员背书/撤销，当前态 + 历史时间线
 * - 查询：verify、getAttestation、getReportStatus、getAttestationHistory、getUploader
 * - 奖励：审计合格自动铸造 GreenToken 给上传者
 */

interface IGreenToken {
    function mint(address to, uint256 amount) external;
}

contract ESGGovernance {
    // ---------------------- 基础存证 ----------------------
    mapping(bytes32 => bool) private _registered;           // hash => registered?
    mapping(bytes32 => address) private _uploader;          // hash => who uploaded
    event ReportRegistered(bytes32 indexed contentHash, address indexed sender, uint256 timestamp);

    function registerContent(bytes32 contentHash) external {
        require(contentHash != bytes32(0), "invalid hash");
        require(!_registered[contentHash], "already registered");
        _registered[contentHash] = true;
        _uploader[contentHash] = msg.sender;
        emit ReportRegistered(contentHash, msg.sender, block.timestamp);
    }

    function verifyContent(bytes32 contentHash) external view returns (bool) {
        return _registered[contentHash];
    }

    function getUploader(bytes32 contentHash) external view returns (address) {
        return _uploader[contentHash];
    }

    // ---------------------- 权限：owner & 审计员白名单 ----------------------
    address public owner;
    mapping(address => bool) public isAuditor; // 审计员白名单

    event OwnerTransferred(address indexed prevOwner, address indexed newOwner);
    event AuditorSet(address indexed auditor, bool allowed);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyAuditor() {
        require(isAuditor[msg.sender], "only auditor");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAuditor(address auditor, bool allowed) external onlyOwner {
        require(auditor != address(0), "zero addr");
        isAuditor[auditor] = allowed;
        emit AuditorSet(auditor, allowed);
    }

    // ---------------------- 审计背书（当前态 + 历史） ----------------------
    struct Attestation {
        bool exists;            // 当前是否有有效背书
        bool passed;            // 合格/不合格
        uint64 timestamp;       // 背书时间
        address auditor;        // 背书人
        string reason;          // 备注（可空）
    }
    mapping(bytes32 => Attestation) private _currentAttestation;

    struct AttestationHistory {
        bool passed;
        uint64 timestamp;
        address auditor;
        string action; // "ATTEST" / "REVOKE"
        string reason; // 可选
    }
    mapping(bytes32 => AttestationHistory[]) private _history;

    event ReportAttested(
        bytes32 indexed contentHash,
        address indexed auditor,
        bool passed,
        string reason,
        uint256 timestamp
    );

    event AttestationRevoked(
        bytes32 indexed contentHash,
        address indexed auditor,
        string reason,
        uint256 timestamp
    );

    // ---------------------- 激励机制（GT 奖励） ----------------------
    IGreenToken public rewardToken;                 // GreenToken 合约
    uint256 public rewardAmount = 10 * 1e18;       // 默认 10 GT

    event RewardTokenSet(address indexed token);
    event RewardAmountSet(uint256 amount);
    event RewardMinted(bytes32 indexed contentHash, address indexed to, uint256 amount);

    function setRewardToken(address tokenAddr) external onlyOwner {
        rewardToken = IGreenToken(tokenAddr);
        emit RewardTokenSet(tokenAddr);
    }

    function setRewardAmount(uint256 amount) external onlyOwner {
        rewardAmount = amount;
        emit RewardAmountSet(amount);
    }

    /**
     * 审计员背书（会记录当前态 + 追加历史；若合格则发放奖励）
     */
    function attestReport(bytes32 contentHash, bool passed, string calldata reason)
        external
        onlyAuditor
    {
        require(_registered[contentHash], "not registered");

        _currentAttestation[contentHash] = Attestation({
            exists: true,
            passed: passed,
            timestamp: uint64(block.timestamp),
            auditor: msg.sender,
            reason: reason
        });

        _history[contentHash].push(AttestationHistory({
            passed: passed,
            timestamp: uint64(block.timestamp),
            auditor: msg.sender,
            action: "ATTEST",
            reason: reason
        }));

        emit ReportAttested(contentHash, msg.sender, passed, reason, block.timestamp);

        // ✅ 合格则奖励上传者
        if (passed) {
            address uploader = _uploader[contentHash];
            if (uploader != address(0) && address(rewardToken) != address(0) && rewardAmount > 0) {
                rewardToken.mint(uploader, rewardAmount);
                emit RewardMinted(contentHash, uploader, rewardAmount);
            }
        }
    }

    /**
     * 撤销当前背书（为可问责性起见：限制为“最近一次背书者本人”）
     */
    function revokeAttestation(bytes32 contentHash, string calldata reason)
        external
        onlyAuditor
    {
        Attestation memory cur = _currentAttestation[contentHash];
        require(cur.exists, "no attestation");
        require(cur.auditor == msg.sender, "not the attesting auditor");

        _history[contentHash].push(AttestationHistory({
            passed: cur.passed,
            timestamp: uint64(block.timestamp),
            auditor: msg.sender,
            action: "REVOKE",
            reason: reason
        }));

        delete _currentAttestation[contentHash];

        emit AttestationRevoked(contentHash, msg.sender, reason, block.timestamp);
    }

    // （可选）如果你希望 owner 也能紧急撤销，放开下面函数：
//  function ownerRevoke(bytes32 contentHash, string calldata reason) external onlyOwner {
//      Attestation memory cur = _currentAttestation[contentHash];
//      require(cur.exists, "no attestation");
//      _history[contentHash].push(AttestationHistory({
//          passed: cur.passed,
//          timestamp: uint64(block.timestamp),
//          auditor: cur.auditor,
//          action: "OWNER_REVOKE",
//          reason: reason
//      }));
//      delete _currentAttestation[contentHash];
//      emit AttestationRevoked(contentHash, msg.sender, reason, block.timestamp);
//  }

    // ---------------------- 查询接口 ----------------------
    function getAttestation(bytes32 contentHash) external view returns (Attestation memory) {
        return _currentAttestation[contentHash];
    }

    function getReportStatus(bytes32 contentHash)
        external
        view
        returns (
            bool registered,
            bool hasAttestation,
            bool passed,
            address auditor,
            uint64 timestamp,
            string memory reason
        )
    {
        registered = _registered[contentHash];
        Attestation memory a = _currentAttestation[contentHash];
        hasAttestation = a.exists;
        passed = a.passed;
        auditor = a.auditor;
        timestamp = a.timestamp;
        reason = a.reason;
    }

    function getAttestationHistory(bytes32 contentHash)
        external
        view
        returns (AttestationHistory[] memory)
    {
        return _history[contentHash];
    }
}
