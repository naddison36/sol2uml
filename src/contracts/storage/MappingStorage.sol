// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

enum Severity {
    Low,
    Medium,
    High
}

struct ExampleStruct {
    bool flag;
    address token;
    Severity severity;
    address[] dynamicAddressArray;
    uint256[2] staticIntArray;
    string someString;
    mapping(address => uint256) claimed;
}

contract MappingStorage {

    // Classic token mapping of user address to token balance
    mapping(address => uint256) public balances;

    // Mapping of user address to spender address to transfer limit
    mapping(address => mapping(address => uint256)) public allowances;

    mapping(uint256 => address[]) public grantRecipients;

    mapping(address => ExampleStruct) public mapToStruct;
}
