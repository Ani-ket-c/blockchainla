// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Nexus402Settlement
 * @notice On-chain settlement & dispute resolution engine for the HTTP 402 Agentic Payment Protocol (x402).
 * @dev Implements EIP-712 cryptographic authorization verification for autonomous machine-to-machine micropayments,
 *      supporting gasless off-chain authorization, batch settlement by authorized facilitators, and SLA escrow staking.
 */
interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Nexus402Settlement {
    // --- Constants & Domain Separator ---
    string public constant NAME = "Nexus402 Protocol";
    string public constant VERSION = "1.0.0";

    bytes32 public constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant PAYMENT_AUTH_TYPEHASH = keccak256(
        "PaymentAuthorization(address payer,address recipient,address token,uint256 amount,uint256 nonce,uint256 deadline,bytes32 serviceHash)"
    );

    bytes32 public immutable DOMAIN_SEPARATOR;
    address public owner;
    
    // Mapping of authorized facilitators (relayers that can execute batch settlements)
    mapping(address => bool) public authorizedFacilitators;

    // Nonce replay protection: payer => nonce => isUsed
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // Service Provider Escrow Stake: provider => amount
    mapping(address => uint256) public providerEscrowStake;

    // --- Events ---
    event PaymentSettled(
        bytes32 indexed authHash,
        address indexed payer,
        address indexed recipient,
        address token,
        uint256 amount,
        bytes32 serviceHash,
        address facilitator
    );

    event BatchSettlementExecuted(
        uint256 totalTransfers,
        uint256 totalVolume,
        address indexed facilitator
    );

    event ProviderStaked(address indexed provider, uint256 amount);
    event ProviderUnstaked(address indexed provider, uint256 amount);
    event FacilitatorUpdated(address indexed facilitator, bool status);

    // --- Structs ---
    struct PaymentAuthorization {
        address payer;
        address recipient;
        address token; // address(0) for native ETH / Base ETH, or ERC20 (e.g. USDC)
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
        bytes32 serviceHash; // sha256/keccak256 hash of service request parameters or endpoint ID
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Nexus402: Caller is not owner");
        _;
    }

    modifier onlyFacilitator() {
        require(authorizedFacilitators[msg.sender] || msg.sender == owner, "Nexus402: Caller not authorized facilitator");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedFacilitators[msg.sender] = true;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    function setFacilitator(address facilitator, bool status) external onlyOwner {
        authorizedFacilitators[facilitator] = status;
        emit FacilitatorUpdated(facilitator, status);
    }

    /**
     * @notice Computes EIP-712 struct hash for a PaymentAuthorization
     */
    function hashAuthorization(PaymentAuthorization calldata auth) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                PAYMENT_AUTH_TYPEHASH,
                auth.payer,
                auth.recipient,
                auth.token,
                auth.amount,
                auth.nonce,
                auth.deadline,
                auth.serviceHash
            )
        );
    }

    /**
     * @notice Computes digest to be signed by the autonomous agent's private key
     */
    function getTypedDataDigest(PaymentAuthorization calldata auth) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hashAuthorization(auth)
            )
        );
    }

    /**
     * @notice Verifies signature validity against the payer's address
     */
    function verifySignature(
        PaymentAuthorization calldata auth,
        bytes calldata signature
    ) public view returns (bool) {
        require(block.timestamp <= auth.deadline, "Nexus402: Authorization expired");
        require(!usedNonces[auth.payer][auth.nonce], "Nexus402: Nonce already used");

        bytes32 digest = getTypedDataDigest(auth);
        address recoveredSigner = recoverSigner(digest, signature);
        return recoveredSigner == auth.payer && recoveredSigner != address(0);
    }

    /**
     * @notice Settles a single x402 payment authorization on-chain
     */
    function settlePayment(
        PaymentAuthorization calldata auth,
        bytes calldata signature
    ) public onlyFacilitator returns (bool) {
        require(verifySignature(auth, signature), "Nexus402: Invalid signature or expired");
        
        usedNonces[auth.payer][auth.nonce] = true;
        bytes32 authHash = hashAuthorization(auth);

        if (auth.token == address(0)) {
            // Native ETH settlement (payer must have pre-deposited or transaction carries msg.value)
            payable(auth.recipient).transfer(auth.amount);
        } else {
            // ERC20 token settlement (e.g., USDC / EURC)
            require(
                IERC20Minimal(auth.token).transferFrom(auth.payer, auth.recipient, auth.amount),
                "Nexus402: Token transfer failed"
            );
        }

        emit PaymentSettled(
            authHash,
            auth.payer,
            auth.recipient,
            auth.token,
            auth.amount,
            auth.serviceHash,
            msg.sender
        );

        return true;
    }

    /**
     * @notice Batch settles multiple x402 micropayments across the agent swarm in a single transaction
     * @dev Dramatically cuts gas costs by aggregating off-chain signed 402 micro-invoices
     */
    function batchSettle(
        PaymentAuthorization[] calldata auths,
        bytes[] calldata signatures
    ) external onlyFacilitator returns (uint256 settledCount, uint256 totalVolume) {
        require(auths.length == signatures.length, "Nexus402: Array length mismatch");

        for (uint256 i = 0; i < auths.length; i++) {
            if (verifySignature(auths[i], signatures[i])) {
                usedNonces[auths[i].payer][auths[i].nonce] = true;
                bytes32 authHash = hashAuthorization(auths[i]);

                bool success = true;
                if (auths[i].token != address(0)) {
                    success = IERC20Minimal(auths[i].token).transferFrom(
                        auths[i].payer,
                        auths[i].recipient,
                        auths[i].amount
                    );
                } else {
                    payable(auths[i].recipient).transfer(auths[i].amount);
                }

                if (success) {
                    settledCount++;
                    totalVolume += auths[i].amount;
                    emit PaymentSettled(
                        authHash,
                        auths[i].payer,
                        auths[i].recipient,
                        auths[i].token,
                        auths[i].amount,
                        auths[i].serviceHash,
                        msg.sender
                    );
                }
            }
        }

        emit BatchSettlementExecuted(settledCount, totalVolume, msg.sender);
    }

    /**
     * @notice Provider stakes collateral into SLA escrow pool
     */
    function stakeProviderCollateral() external payable {
        require(msg.value > 0, "Nexus402: Stake must be > 0");
        providerEscrowStake[msg.sender] += msg.value;
        emit ProviderStaked(msg.sender, msg.value);
    }

    /**
     * @notice Helper to recover signer from EIP-712 digest
     */
    function recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(digest, v, r, s);
    }

    receive() external payable {}
}
