// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract StringStorage {

    // strings
    string public uninitString;
    string public emptyString = "";
    string public name = "StringStorage contract";
    string public exactly31 = "exactly 31 chars so uses 1 slot";
    string public exactly32 = "32 char so uses one dynamic slot";
    string public long2 = "more than 32 bytes so data is stored dynamically in 2 slots";
    string public long3 =
        "more than sixty four (64) bytes so data is stored dynamically in three slots";
}
