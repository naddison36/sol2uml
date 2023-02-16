// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract FixedArrayStorage {

    uint72[5] public five9ByteNumbers = [1, 2**8-1, 2**16-1, 2**32-1, 2**72-1];
    uint56[21] public twentyOne7ByteNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    address[3] public tokens = [0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48, 0xdAC17F958D2ee523a2206206994597C13D831ec7, 0x6B175474E89094C44Da98b954EedeAC495271d0F];
    bytes32[50] public gap;
}
