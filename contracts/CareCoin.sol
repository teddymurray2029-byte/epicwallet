// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CareCoin
 * @notice ERC-20 token for the CareCoin healthcare rewards network
 * @dev Polygon-based token with controlled minting for verified clinical documentation rewards
 * 
 * Key Features:
 * - Fixed maximum supply of 1 billion CARE tokens
 * - Role-based minting (MINTER_ROLE for reward distribution)
 * - 10% network fee automatically sent to treasury on reward mints
 * - Pausable for emergency situations
 * - Burnable for deflationary mechanics
 * 
 * Network: Polygon PoS / Amoy Testnet
 * Treasury Wallet: 0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37
 */
contract CareCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    
    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion CARE
    uint256 public constant NETWORK_FEE_BPS = 1000; // 10% = 1000 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ============ State Variables ============
    address public treasury;
    bool public networkFeeEnabled;
    
    // ============ Events ============
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event NetworkFeeToggled(bool enabled);
    event RewardMinted(
        address indexed recipient,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 feeAmount,
        bytes32 indexed attestationId
    );
    event BulkRewardsMinted(
        uint256 totalRecipients,
        uint256 totalGross,
        uint256 totalFees
    );
    
    // ============ Errors ============
    error ZeroAddress();
    error ExceedsMaxSupply();
    error InvalidAmount();
    error ArrayLengthMismatch();
    
    // ============ Constructor ============
    /**
     * @notice Deploys CareCoin with initial treasury allocation
     * @param _treasury Address to receive network fees and initial supply
     * @param _initialSupply Initial tokens to mint to treasury (in wei, 18 decimals)
     */
    constructor(
        address _treasury,
        uint256 _initialSupply
    ) ERC20("CareCoin", "CARE") {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_initialSupply > MAX_SUPPLY) revert ExceedsMaxSupply();
        
        treasury = _treasury;
        networkFeeEnabled = true;
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Also grant minter role to treasury for reward operations
        _grantRole(MINTER_ROLE, _treasury);
        
        // Mint initial supply to treasury
        if (_initialSupply > 0) {
            _mint(_treasury, _initialSupply);
        }
    }
    
    // ============ Reward Minting ============
    
    /**
     * @notice Mint reward tokens to a recipient with automatic network fee
     * @dev Only callable by addresses with MINTER_ROLE
     * @param recipient Address to receive the reward (after fee)
     * @param grossAmount Total reward amount before network fee
     * @param attestationId Unique identifier linking to off-chain attestation
     */
    function mintReward(
        address recipient,
        uint256 grossAmount,
        bytes32 attestationId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();
        if (grossAmount == 0) revert InvalidAmount();
        
        (uint256 netAmount, uint256 feeAmount) = _calculateFee(grossAmount);
        
        // Check max supply
        if (totalSupply() + grossAmount > MAX_SUPPLY) revert ExceedsMaxSupply();
        
        // Mint fee to treasury
        if (feeAmount > 0) {
            _mint(treasury, feeAmount);
        }
        
        // Mint net amount to recipient
        _mint(recipient, netAmount);
        
        emit RewardMinted(recipient, grossAmount, netAmount, feeAmount, attestationId);
    }
    
    /**
     * @notice Mint rewards to multiple recipients in a single transaction
     * @dev Gas-efficient batch minting for processing multiple attestations
     * @param recipients Array of recipient addresses
     * @param grossAmounts Array of gross reward amounts
     * @param attestationIds Array of attestation identifiers
     */
    function mintRewardsBatch(
        address[] calldata recipients,
        uint256[] calldata grossAmounts,
        bytes32[] calldata attestationIds
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipients.length != grossAmounts.length || recipients.length != attestationIds.length) {
            revert ArrayLengthMismatch();
        }
        
        uint256 totalGross = 0;
        uint256 totalFees = 0;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (grossAmounts[i] == 0) revert InvalidAmount();
            
            (uint256 netAmount, uint256 feeAmount) = _calculateFee(grossAmounts[i]);
            
            totalGross += grossAmounts[i];
            totalFees += feeAmount;
            
            _mint(recipients[i], netAmount);
            
            emit RewardMinted(
                recipients[i],
                grossAmounts[i],
                netAmount,
                feeAmount,
                attestationIds[i]
            );
        }
        
        // Check max supply for total
        if (totalSupply() + totalGross > MAX_SUPPLY) revert ExceedsMaxSupply();
        
        // Mint accumulated fees to treasury in single operation
        if (totalFees > 0) {
            _mint(treasury, totalFees);
        }
        
        emit BulkRewardsMinted(recipients.length, totalGross, totalFees);
    }
    
    /**
     * @notice Direct mint without fee (for migrations, airdrops, etc.)
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }
    
    // ============ Fee Calculation ============
    
    /**
     * @notice Calculate network fee for a given amount
     * @param grossAmount The total amount before fee
     * @return netAmount Amount after fee deduction
     * @return feeAmount The fee amount
     */
    function calculateFee(uint256 grossAmount) external view returns (uint256 netAmount, uint256 feeAmount) {
        return _calculateFee(grossAmount);
    }
    
    function _calculateFee(uint256 grossAmount) internal view returns (uint256 netAmount, uint256 feeAmount) {
        if (!networkFeeEnabled) {
            return (grossAmount, 0);
        }
        feeAmount = (grossAmount * NETWORK_FEE_BPS) / BPS_DENOMINATOR;
        netAmount = grossAmount - feeAmount;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update the treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        
        address oldTreasury = treasury;
        
        // Transfer MINTER_ROLE to new treasury
        _revokeRole(MINTER_ROLE, oldTreasury);
        _grantRole(MINTER_ROLE, newTreasury);
        
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @notice Toggle the network fee on/off
     * @param enabled Whether network fee should be enabled
     */
    function setNetworkFeeEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        networkFeeEnabled = enabled;
        emit NetworkFeeToggled(enabled);
    }
    
    /**
     * @notice Pause all token transfers and minting
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause token transfers and minting
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get remaining mintable supply
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
    
    /**
     * @notice Check if an address has minting privileges
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
    
    // ============ Overrides ============
    
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
