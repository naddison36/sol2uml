// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract DynamicArrayStorage {

    uint256[] public numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    uint256[] public empty;
    uint56[] public sevenByteNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    address[] public tokens = [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xdAC17F958D2ee523a2206206994597C13D831ec7, 0x6B175474E89094C44Da98b954EedeAC495271d0F];
}
