// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MultiFixedArrayStorage {
    uint256[3][2] public twoByThreeNumbers = [[1, 2, 3], [4, 5, 6]];
    bool[2][3] public threeByTwoBool = [[true, false], [false, true], [true, false]];
    bool[3][2] public twoByThreeBool = [[true, false, true], [false, true, false]];
}
