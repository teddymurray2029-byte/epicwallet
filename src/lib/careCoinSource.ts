// Flattened CareCoin Solidity source for in-browser compilation
// All OpenZeppelin dependencies are inlined to avoid import resolution issues

export const CARE_COIN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============ OpenZeppelin Inlined Dependencies ============

// --- IERC20 ---
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// --- IERC20Metadata ---
interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

// --- IERC20Errors ---
interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

// --- Context ---
abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
    function _msgData() internal view virtual returns (bytes calldata) { return msg.data; }
    function _contextSuffixLength() internal view virtual returns (uint256) { return 0; }
}

// --- ERC20 ---
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) { _name = name_; _symbol = symbol_; }
    function name() public view virtual returns (string memory) { return _name; }
    function symbol() public view virtual returns (string memory) { return _symbol; }
    function decimals() public view virtual returns (uint8) { return 18; }
    function totalSupply() public view virtual returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view virtual returns (uint256) { return _balances[account]; }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert ERC20InvalidSender(address(0));
        if (to == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) revert ERC20InsufficientBalance(from, fromBalance, value);
            unchecked { _balances[from] = fromBalance - value; }
        }
        if (to == address(0)) {
            unchecked { _totalSupply -= value; }
        } else {
            unchecked { _balances[to] += value; }
        }
        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidSender(address(0));
        _update(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));
        _allowances[owner][spender] = value;
        if (emitEvent) emit Approval(owner, spender, value);
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            unchecked { _approve(owner, spender, currentAllowance - value, false); }
        }
    }
}

// --- ERC20Burnable ---
abstract contract ERC20Burnable is Context, ERC20 {
    function burn(uint256 value) public virtual {
        _burn(_msgSender(), value);
    }
    function burnFrom(address account, uint256 value) public virtual {
        _spendAllowance(account, _msgSender(), value);
        _burn(account, value);
    }
}

// --- Pausable ---
abstract contract Pausable is Context {
    event Paused(address account);
    event Unpaused(address account);
    error EnforcedPause();
    error ExpectedPause();
    bool private _paused;

    constructor() { _paused = false; }
    modifier whenNotPaused() { _requireNotPaused(); _; }
    modifier whenPaused() { _requirePaused(); _; }
    function paused() public view virtual returns (bool) { return _paused; }

    function _requireNotPaused() internal view virtual {
        if (paused()) revert EnforcedPause();
    }

    function _requirePaused() internal view virtual {
        if (!paused()) revert ExpectedPause();
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// --- ERC20Pausable ---
abstract contract ERC20Pausable is ERC20, Pausable {
    function _update(address from, address to, uint256 value) internal virtual override {
        if (paused()) revert EnforcedPause();
        super._update(from, to, value);
    }
}

// --- IAccessControl ---
interface IAccessControl {
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);
    error AccessControlBadConfirmation();
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// --- AccessControl ---
abstract contract AccessControl is Context, IAccessControl {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }
    mapping(bytes32 role => RoleData) private _roles;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) revert AccessControlUnauthorizedAccount(account, role);
    }

    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) revert AccessControlBadConfirmation();
        _revokeRole(role, callerConfirmation);
    }

    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        }
        return false;
    }

    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        }
        return false;
    }
}

// ============ CareCoin Contract ============

contract CareCoin is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    uint256 public constant NETWORK_FEE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public treasury;
    bool public networkFeeEnabled;

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event NetworkFeeToggled(bool enabled);
    event RewardMinted(address indexed recipient, uint256 grossAmount, uint256 netAmount, uint256 feeAmount, bytes32 indexed attestationId);
    event BulkRewardsMinted(uint256 totalRecipients, uint256 totalGross, uint256 totalFees);

    error ZeroAddress();
    error ExceedsMaxSupply();
    error InvalidAmount();
    error ArrayLengthMismatch();

    constructor(address _treasury, uint256 _initialSupply) ERC20("CareCoin", "CARE") {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_initialSupply > MAX_SUPPLY) revert ExceedsMaxSupply();

        treasury = _treasury;
        networkFeeEnabled = true;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, _treasury);

        if (_initialSupply > 0) { _mint(_treasury, _initialSupply); }
    }

    function mintReward(address recipient, uint256 grossAmount, bytes32 attestationId) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();
        if (grossAmount == 0) revert InvalidAmount();
        (uint256 netAmount, uint256 feeAmount) = _calculateFee(grossAmount);
        if (totalSupply() + grossAmount > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (feeAmount > 0) { _mint(treasury, feeAmount); }
        _mint(recipient, netAmount);
        emit RewardMinted(recipient, grossAmount, netAmount, feeAmount, attestationId);
    }

    function mintRewardsBatch(address[] calldata recipients, uint256[] calldata grossAmounts, bytes32[] calldata attestationIds) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipients.length != grossAmounts.length || recipients.length != attestationIds.length) revert ArrayLengthMismatch();
        uint256 totalGross = 0;
        uint256 totalFees = 0;
        uint256 len = recipients.length;
        uint256[] memory netAmounts = new uint256[](len);
        uint256[] memory feeAmounts = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            if (recipients[i] == address(0)) revert ZeroAddress();
            if (grossAmounts[i] == 0) revert InvalidAmount();
            (uint256 n, uint256 f) = _calculateFee(grossAmounts[i]);
            totalGross += grossAmounts[i];
            totalFees += f;
            netAmounts[i] = n;
            feeAmounts[i] = f;
        }
        if (totalSupply() + totalGross > MAX_SUPPLY) revert ExceedsMaxSupply();
        for (uint256 i = 0; i < len; i++) {
            _mint(recipients[i], netAmounts[i]);
            emit RewardMinted(recipients[i], grossAmounts[i], netAmounts[i], feeAmounts[i], attestationIds[i]);
        }
        if (totalFees > 0) { _mint(treasury, totalFees); }
        emit BulkRewardsMinted(len, totalGross, totalFees);
    }

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }

    function calculateFee(uint256 grossAmount) external view returns (uint256 netAmount, uint256 feeAmount) {
        return _calculateFee(grossAmount);
    }

    function _calculateFee(uint256 grossAmount) internal view returns (uint256 netAmount, uint256 feeAmount) {
        if (!networkFeeEnabled) return (grossAmount, 0);
        feeAmount = (grossAmount * NETWORK_FEE_BPS) / BPS_DENOMINATOR;
        netAmount = grossAmount - feeAmount;
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        _revokeRole(MINTER_ROLE, oldTreasury);
        _grantRole(MINTER_ROLE, newTreasury);
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setNetworkFeeEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        networkFeeEnabled = enabled;
        emit NetworkFeeToggled(enabled);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }
    function remainingSupply() external view returns (uint256) { return MAX_SUPPLY - totalSupply(); }
    function isMinter(address account) external view returns (bool) { return hasRole(MINTER_ROLE, account); }


    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
`;
