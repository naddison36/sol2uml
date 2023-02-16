// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MultiDynamicArrayStorage {

    uint256[][] public twoDimDynIntArray;
    uint256[][][] public threeDimDynIntArray;
    
    constructor() {
        twoDimDynIntArray.push([11111, 11122]);
        twoDimDynIntArray.push([222111, 222222, 222333]);
        twoDimDynIntArray.push();
        twoDimDynIntArray.push([254]);
        twoDimDynIntArray.push([0]);
        twoDimDynIntArray.push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        twoDimDynIntArray.push([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
        twoDimDynIntArray.push([12, 1212, 121212, 12121212]);

        threeDimDynIntArray.push();
        threeDimDynIntArray[0].push([111111, 111122]);
        threeDimDynIntArray[0].push([112211, 112222, 112233]);
        threeDimDynIntArray.push();
        threeDimDynIntArray[1].push([221111, 221122, 221133, 221144]);
        threeDimDynIntArray[1].push([222211, 222222, 222233, 222244, 222255]);
        threeDimDynIntArray[1].push();
        threeDimDynIntArray[1].push();
        threeDimDynIntArray[1].push();
        threeDimDynIntArray[1].push([11, 12, 13]);
        threeDimDynIntArray.push();
        threeDimDynIntArray[2].push([331111]);
        threeDimDynIntArray[2].push();
        threeDimDynIntArray[2].push([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        threeDimDynIntArray.push();
    }
}
