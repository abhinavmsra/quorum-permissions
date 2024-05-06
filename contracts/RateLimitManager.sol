// SPDX-License-Identifier: MIT
pragma solidity ^0.5.3;

import "./PermissionsInterface.sol";
import "./PermissionsImplementation.sol";
import "./PermissionsUpgradable.sol";

contract RateLimitManager {
    struct Blocks {
        uint256 blockNumber;
        mapping(address => uint16) transactionCount;
    }

    uint8 constant BLOCK_TIME = 5;

    string public orgId;
    uint16 public threshold;
    uint16 public window;
    PermissionsUpgradable public permUpgradable;

    uint16 private blocksInWindow;
    Blocks[] private blocks;

    /** @notice confirms that the caller is the address of implementation
        contract
      */
    modifier onlyImplementation() {
        require(msg.sender == permUpgradable.getPermImpl(), "invalid caller");
        _;
    }

    /** @notice confirms that the account passed is org admin account
     */
    modifier onlyOrgAdmin() {
        require(
            PermissionsInterface(permUpgradable.getPermInterface()).isOrgAdmin(
                msg.sender,
                orgId
            ) == true,
            "account is not a org admin account"
        );
        _;
    }

    constructor(
        string memory _orgId,
        address _permUpgradable,
        uint16 _threshold,
        uint16 _window
    ) public {
        require(_window > 0, "window cannot be zero");

        orgId = _orgId;
        permUpgradable = PermissionsUpgradable(_permUpgradable);

        threshold = _threshold;
        window = _window;
        blocksInWindow = _window / BLOCK_TIME;
    }

    function updateLimits(
        uint16 _threshold,
        uint16 _window
    ) external onlyOrgAdmin returns (uint16, uint16) {
        require(_window > 0, "window cannot be zero");

        delete blocks; // reset blocks array when threshold or window is updated

        threshold = _threshold;
        window = _window;
        blocksInWindow = _window / BLOCK_TIME;

        return (threshold, window);
    }

    function transactionAllowed(
        address _sender
    ) public onlyImplementation returns (bool) {
        uint16 currentBlockIndex = _recordBlock();
        uint16 txCount = _senderTransactionCount(_sender);

        bool withinLimits = txCount < threshold;

        if (withinLimits) {
            blocks[currentBlockIndex].transactionCount[_sender] = ++txCount;
        }

        return withinLimits;
    }

    function _senderTransactionCount(
        address _sender
    ) private view returns (uint16) {
        uint16 totalCount = 0;

        for (uint16 i = 0; i < blocksInWindow; ++i) {
            totalCount += blocks[i].transactionCount[_sender];
        }

        return totalCount;
    }

    function _recordBlock() private returns (uint16) {
        uint16 currentBlockIndex = uint16(block.number % blocksInWindow);

        if (blocks[currentBlockIndex].blockNumber != block.number) {
            delete blocks[currentBlockIndex];
            blocks[currentBlockIndex].blockNumber = block.number;
        }

        return currentBlockIndex;
    }
}
