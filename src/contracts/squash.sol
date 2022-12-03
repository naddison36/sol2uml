pragma solidity ^0.8.16;

contract CommonContract {
    function commonFunction() public {}
    function commonOverride() public virtual returns (address) {}
}

contract GrandParentLeft {
    uint256 integer1 = 1;
    uint256 constant ConstInteger1 = 1;

    function basePublicFunctionNoParams() public virtual {}
    function parentPublicFunctionNoParams() public virtual {}
    function grandParentPublicFunctionNoParams() public virtual {}

    function basePublicFunctionIntParam(uint256 value) public virtual {}

    function overrideFunction(uint256 value) public virtual {}
    function overrideGrantParentFunctionReturn(uint256 value, address account) public virtual returns (bool) {}

    function grandParentPrivateFunction() private {}
    function grandParentInternalFunction() internal {}
}

contract ParentLeft is GrandParentLeft, CommonContract {
    uint256 integer2 = 2;
    uint256 constant ConstInteger2 = 2;

    function basePublicFunctionNoParams() public virtual override {}
    function parentPublicFunctionNoParams() public virtual override {}

    function basePublicFunctionIntParam(uint256 value) public virtual override {}

    function overrideFunction(uint256 value, address account) public virtual {}
    function overrideParentFunctionReturn(uint256 value, address account) public virtual returns (bool, bool) {}

    function parentPrivateFunction() private {}

    function callInternalGrandParent() external {
        grandParentInternalFunction();
    }
}

contract GrandParentRight is CommonContract {
    uint256 integer4 = 3;
    uint256 constant ConstInteger4 = 3;

    function commonOverride() public virtual override returns (address) {}
}

contract ParentRight is GrandParentRight {
    uint256 integer5 = 4;
    uint256 constant ConstInteger5 = 4;
}

contract Squash is ParentLeft, ParentRight {

    bool baseBool = true;
    bool constant BaseConstantBool = true;

    uint256 baseInteger = 5;
    uint256 integer3 = 5;
    uint256 integer6 = 5;

    uint256 constant ConstInteger3 = 5;
    uint256 constant ConstInteger6 = 5;

    function commonOverride() public override (CommonContract, GrandParentRight) returns (address) {}

    function basePublicFunctionNoParams() public override {}
    function basePublicFunctionIntParam(uint256 value) public virtual override {}

    function overrideFunction(uint256 value, address account) public override {}
    function overrideFunction(uint256 value, address account, bool flag) public {}

    function basePrivateFunction() private {}
}
