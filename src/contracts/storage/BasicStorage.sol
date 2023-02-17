// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

enum Severity {
    Low,
    Medium,
    High
}

interface ITrade {
    function buy(address buy, address sell, uint256 buyAmount) external;
    function sell(address buy, address sell, uint256 sellAmount) external;
}

contract BasicStorage {
    // boolean
    bool someBool = true;
    // enum
    Severity severity = Severity.Medium;
    // numbers
    uint8 public tinyNumber = 250;
    uint256 public fullSlotNumber = 20000e18;
    int16 public smallNegativeNumber = -10000;
    uint128 public halfSlotNumber = 10000e18;
    // addresses
    address public owner = address(this);
    ITrade public exchange = ITrade(0x1C727a55eA3c11B0ab7D3a361Fe0F3C47cE6de5d);
    // fixed-size bytes
    bytes1 public oneByte = bytes1(0xFF);
    bytes8 public eightBytes = bytes8(0x8100FF81C300FF01);
    bytes32 public fullSlotBytes = 0xe9b69cd5563a8bfbffb0fa4f422862013492d43fe7fb62d771a0147b6e891d13;
    // strings
    string public name = "BasicStorage contract";
    bytes public data = hex"FFEEDDCCBBAA9988770011";
}
