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
    int64[] dynamicIntArray;
    uint256[2] staticIntArray;
    string someString;
}

contract StructStorage {

    ExampleStruct public exampleStruct;
    ExampleStruct[] public dynamicStructs;

    constructor() {
        exampleStruct.flag = true;
        exampleStruct.token = 0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656;
        exampleStruct.severity = Severity.High;
        exampleStruct.dynamicAddressArray = [0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D, 0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6, 0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF];
        exampleStruct.dynamicIntArray.push(1);
        exampleStruct.dynamicIntArray.push(-1);
        exampleStruct.dynamicIntArray.push(1023);
        exampleStruct.staticIntArray[0] = 11;
        exampleStruct.staticIntArray[1] = 22;
        exampleStruct.someString = "more than sixty four (64) bytes so data is stored dynamically in three slots";

        dynamicStructs.push();
        dynamicStructs[0].flag = true;
        dynamicStructs[0].token = 0x22E2219F098Ab128F11BE752Da4fC8e1c6BA2F3f;
        dynamicStructs[0].severity = Severity.Medium;
        dynamicStructs[0].dynamicAddressArray = [0x2A0b4Bdb2492eC4D8eA0015A6784ACC98216c5D2];
        dynamicStructs[0].dynamicIntArray.push(1111);
        dynamicStructs[0].dynamicIntArray.push(2222);
        dynamicStructs[0].staticIntArray[0] = 33;
        dynamicStructs[0].staticIntArray[1] = 44;
        dynamicStructs[0].someString = "a short string";
    }
}
