// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

struct SubOneSlot {
    address account; // 20 bytes
    bool flag; // 1 byte
    int8 count; // 1 byte
}

struct OneSlot {
    address account; // 20 bytes
    uint88 sum; // 11 bytes
    uint8 count; // 1 bytes
}

struct SubTwoSlots {
    address account1;
    address account2;
    bool flag1;
    bool flag2;
}

struct ContractLevelStruct0 {
    uint256 param1;
    bool param2;
}

struct ContractLevelStruct1 {
    uint256 param1;
    address param2;
    uint8 param3;
    bytes1 param4;
}

struct ContractLevelStruct2 {
    ContractLevelStruct0 param1;
    ContractLevelStruct1 param2;
}

struct ContractLevelStruct11 {
    ContractLevelStruct1 param1;
}

enum Severity {
    Low,
    Medium,
    High
}

uint256 constant FileConstant = 5;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}

contract GrandParent {
    bool initGP;
    address grandParent;

    constructor() {
        initGP = true;
        grandParent = 0xfF1b44f1FCCebc4890B5E00a1EA9259d00a40fEb;
    }
}

contract Parent is GrandParent {
    bool initP;
    address parent;

    constructor() {
        initP = true;
        parent = 0xeC20607aa654D823DD01BEB8780a44863c57Ed07;
    }
}

contract Parent2 is GrandParent {
    bool initP2;
    address parent2;

    constructor() {
        initP2 = true;
        parent2 = 0xb985439AFa9314dCB002E191e230A5936493479B;
    }
}

contract TestStorage is Parent, Parent2 {
    struct TwoSlots {
        bytes32 hash1;
        bytes32 hash2;
    }

    struct FixedArray {
        uint16 num1;
        bytes30[2] data;
        uint16 num2;
    }

    struct FlagsStruct {
        bool flag1;
        bool[2] flags;
        bool flag2;
    }

    enum Status {
        Open,
        Resolved
    }

    uint256 public constant N_COINS = 2;
    uint256 public constant MAX_COINS = 3;
    address public immutable superUser;

    address owner = 0x2f2Db75C5276481E2B018Ac03e968af7763Ed118;
    IERC20 token = IERC20(0x34f08F2A3f4a86531e9C4139Fde571a62689AFEC);
    address[] tokensDyn = [
        0xfF000000000000000000000000000000000000A1,
        0xff000000000000000000000000000000000000b2,
        0xFf000000000000000000000000000000000000c3,
        0xFF000000000000000000000000000000000000d4
    ];
    IERC20[2] tokenPair = [
        IERC20(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5),
        IERC20(0x945Facb997494CC2570096c74b5F66A3507330a1)
    ];
    address[12] dozenTokens = [
        0xa57Bd00134B2850B2a1c55860c9e9ea100fDd6CF,
        0x2000000000000000000000000000000000000001,
        0x2000000000000000000000000000000000000002,
        0x2000000000000000000000000000000000000003,
        0x2000000000000000000000000000000000000004,
        0x2000000000000000000000000000000000000005,
        0x2000000000000000000000000000000000000006,
        0x2000000000000000000000000000000000000007,
        0x2000000000000000000000000000000000000008,
        0x2000000000000000000000000000000000000009,
        0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    ];
    address[N_COINS] coins = [
        0x3000000000000000000000000000000000000001,
        0x3000000000000000000000000000000000000002
    ];
    address[N_COINS][3][N_COINS] multiDimension;
    uint256[MAX_COINS] maxCoins = [1234, 567, 8910];
    IERC20[N_COINS] tokens = [
        IERC20(0x4000000000000000000000000000000000000001),
        IERC20(0x4000000000000000000000000000000000000002)
    ];
    // address[2 * N_COINS] doubleTokens;

    uint256 totalSupply = 123123123123456789012345678;
    uint128 rate1 = 123 * 1e18;
    uint128 rate2 = 456 * 1e18;
    // fixed float1 = 1.0234;
    // ufixed float2 = 99.9999;
    // ufixed128x18 float3 = 0.001;
    // fixed128x18 float4 = 12345.0123;
    bytes32 hash = 0xe9b69cd5563a8bfbffb0fa4f422862013492d43fe7fb62d771a0147b6e891d13;
    bool public flag1 = true;
    bool private flag2 = true;
    bool internal flag3 = true;
    bool public flag4 = false;
    bool[2] public flags = [true, true];
    bool public flag5 = true;
    bool[2][2] public flags2x2 = [[true, false], [true, true]];
    bool public flag6 = true;
    bool[2][3] public flags2x3 = [[true, false], [false, true], [true, true]];
    bool public flag7 = true;
    bool[3][2] public flags3x2 = [[true, false, true], [false, true, false]];

    bool[33][2] public flags33x2 = [[true, true, false, true], [true, false, true, true]];
    bool[2][33] public flags2x33 = [[true, true], [true, false], [false, true], [false, false]];
    bool public flag8 = true;
    bool[] public flagsDyn = [true, true, true, false, true, false, true];
    bool[][] public flagsDynDyn;
    bool[][][] public flagsDynDynDyn;
    bool[2][] public flags2xDyn = [
        [true, true],
        [true, true],
        [false, true],
        [true, false],
        [false, false],
        [true, true]
    ];
    bool public flag9 = true;
    bool[][2] public flagsDynx2;
    bool[][16] public flagsDynx16;
    bool[][32] public flagsDynx32;
    bool[32][] public flags32xDyn;
    bool[][4][3] public flagsDynx4x3 = [
        [[true, false, true], [false, true, false], [false, false, true], [true, true, true]],
        [[false, false, false], [true, true, true], [false, true, false], [true, false, true]]
    ];
    bool[33][2][2] public bool_33x2x2;
    bool public flag10 = true;
    bytes30[2][6] public bytes30_2x6;
    bytes30[6][2] public bytes30_6x2;
    bytes32[] public bytes32Dyn = [
        bytes32(0xFF00128251ec233d387a0af31db13f8318b61e40975c27476e1c1a02b79700FF),
        0xEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD
    ];
    bool public flag11 = true;
    uint32[FileConstant] public timestamps = [1060001, 1160111, 1260223, 1360333, 1660445];
    TwoSlots[2] public twoSlots2x;
    TwoSlots[3][4] public twoSlots3x4;
    TwoSlots[4][3] public twoSlots4x3;
    TwoSlots[][3] public twoSlotsDynx3;
    TwoSlots[3][] public twoSlots3xDyn;
    TwoSlots[][] public twoSlotsDynxDyn;
    TwoSlots[][4][3] public twoSlotsDynx4x3;
    TwoSlots[3][4][] public twoSlotsDynx3x4xDyn;
    Status public status = Status.Open;
    Severity public severity = Severity.High;
    SubOneSlot public subSlot = SubOneSlot(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5, true, -121);
    uint8 public oneByteNumber = 253;
    OneSlot public oneSlot = OneSlot(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5, 1234567890, 253);
    SubTwoSlots public subTwoSlot =
        SubTwoSlots(
            0xF4dDc5FF5AbA6E8739E5E056340827c573d191Ec,
            0xe63dfF84aa562dE11B28894f0391702b814f812D,
            true,
            true
        );
    TwoSlots public twoSlots =
        TwoSlots(
            0xAFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF9,
            0xEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD
        );
    FixedArray public fixedArray;
    FlagsStruct public flagStruct = FlagsStruct(true, [true, true], true);
    int16 public arrayCount = -2000;
    uint64[] public dynamicInt64Array = [2000, 1, 254, 1e19, 254, 2, 256];
    uint128[] public dynamicInt128Array = [1e38, 2e38, 3e38];
    uint136[] public dynamicInt136Array = [1e40, 2e39];
    uint256[] public dynamicInt256Array = [1e77, 2e76, 3e76, 4e76];
    uint256[3] public fixedIntArray = [1000, 2000, 3000];
    uint256[][] public dynamicDynIntArray;
    uint256[][][] public dynamicDynDynIntArray;
    mapping(address => bool) public blacklist;
    mapping(address => uint256) public balance;
    mapping(address => ContractLevelStruct2) public mapStruct;
    mapping(address => mapping(address => ContractLevelStruct2)) public mapOfMapStruct;
    mapping(address => IERC20) public mapInterface;
    IERC20[2] public interfaceFixedArray = [
        IERC20(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5),
        IERC20(0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19)];
    IERC20[] public interfaceDynArray = [
        IERC20(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5),
        IERC20(0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19),
        IERC20(0x78BefCa7de27d07DC6e71da295Cc2946681A6c7B)];
    string public uninitialisedString;
    string public emptyString = "";
    string public name = "TestStorage contract";
    string public short = "Less than 31 bytes";
    string public exactly30 = "exactly 30 char so uses 1 slot";
    string public exactly31 = "exactly 31 chars so uses 1 slot";
    string public exactly32 = "exactly 32 chars so uses 2 slots";
    string public long2 = "more than 31 bytes so data is stored dynamically in 2 slots";
    string public long3 =
        "more than sixty four (64) bytes so data is stored dynamically in three slots";

    // The following can be publicly changed for testing purposes
    string public testString = "This can be publicly changed by anyone";
    bytes public testBytes = hex"FFEEDDCCBBAA9988770011";
    bytes public exactly31Bytes = hex"ec0b854938343f85eb39a6648b9e449c2e4aee4dc9b4e96ab592f9f497d051";
    bytes public exactly32Bytes = hex"2619ec68b255542e3da68c054bfe0d7d0f27b7fdbefc8bbccdd23188fc71fe7f";
    bytes public long3Bytes = hex"f34d3c319f536deb74ed8f1f3205d9aefef7487c819e77d3351630820dbff1118cc7ee599e5d59fee88c83157bd897847c5911dc7d317b3175e0b085198349973fff";
    uint256 public testUint256 = 0xFEDCBA9876543210;
    int256 public testInt256 = -1023;
    address public testAddress;

    constructor(address _superUser) {
        superUser = _superUser;

        multiDimension[0][0][0] = 0xFfffFfFFFfFFFFfFFfFFFfFFFfFFfFFFfFfFfFf1;
        multiDimension[0][0][1] = 0xfffFFFFFFFfFFFFfFFfFfFFffFfFfFffFFFFfFf2;

        flags33x2[0][32] = true;

        flagsDynx2[0] = [true, false, false, true, true, false, true, true, false, false, true, true, false, true, false, false, true, false, true, false, true, false, false, true, true, false, true, true, false, false, true, true, true, false, true];
        flagsDynx2[1] = [true, false, true, false, true, true, true, true, false, true];

        flagsDynDyn.push([true, true, false, true, true]);
        flagsDynDyn.push([true, false, true]);
        flagsDynDyn.push();
        flagsDynDyn.push([true, true]);

        flagsDynDynDyn.push();
        flagsDynDynDyn[0].push([true, true, false, true]);
        flagsDynDynDyn.push();
        flagsDynDynDyn[1].push([true, false, false, true, true]);
        flagsDynDynDyn.push();
        flagsDynDynDyn[2].push();
        flagsDynDynDyn[2][0].push(true);
        flagsDynDynDyn[2][0].push(false);
        flagsDynDynDyn[2][0].push(true);

        flagsDynx16[0].push(true);
        flagsDynx16[0].push(true);
        flagsDynx16[0].push(false);
        flagsDynx16[0].push(true);
        flagsDynx16[1].push(true);
        flagsDynx16[1].push(false);
        flagsDynx16[1].push(true);
        flagsDynx16[2].push(true);
        flagsDynx16[2].push(true);
        flagsDynx16[15].push(true);

        flagsDynx32[0].push(true);
        flagsDynx32[0].push(true);
        flagsDynx32[1].push(true);

        flags32xDyn.push([true, false, true]);
        flags32xDyn.push([true, false, true, false, true]);

        bool_33x2x2[0][0][0] = true;
        bool_33x2x2[1][1][1] = true;

        bytes30_2x6[0][0] = 0xBBB000000000000000000000000000000000000000000000000000000BBB;
        bytes30_6x2[0][0] = 0xCCC000000000000000000000000000000000000000000000000000000CCC;

        fixedArray.num1 = 65535;
        fixedArray.num2 = 65001;
        fixedArray.data = [
            bytes30(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF),
            0xFFF000000F00000000000000000000000000000000000000000000000FFF
        ];

        dynamicDynIntArray.push([11111, 11122]);
        dynamicDynIntArray.push([222111, 222222, 222333]);

        dynamicDynDynIntArray.push();
        dynamicDynDynIntArray[0].push([111111, 111122]);
        dynamicDynDynIntArray[0].push([112211, 112222, 112233]);
        dynamicDynDynIntArray.push();
        dynamicDynDynIntArray[1].push([221111, 221122, 221133, 221144]);
        dynamicDynDynIntArray[1].push([222211, 222222, 222233, 222244, 222255]);
        dynamicDynDynIntArray.push();
        dynamicDynDynIntArray[2].push([331111]);

        blacklist[0x2f2Db75C5276481E2B018Ac03e968af7763Ed118] = true;
        blacklist[0xdb2C46Ed8E850668b942d9Bd6D2ae8803c6789DF] = false;
        balance[0x2f2Db75C5276481E2B018Ac03e968af7763Ed118] = 0x1234566789ABCDEF;

        twoSlots2x[0] = TwoSlots(
            0xFFFF00000F000000000000000000000000000000000000000000000000FFFFFF,
            0xFFFFF0000FF0000000000000000000000000000000000000000000000FFFFFFF
        );
        twoSlots2x[1] = TwoSlots(
            0xFF0000000F0000000000000000000000000000000000000000000000000000FF,
            0xFFF000000FF00000000000000000000000000000000000000000000000000FFF
        );

        twoSlots3x4[0][0] = TwoSlots(
            0xFF000000000000000000000000000000000000000000000000000000000000FF,
            0xFFF000000F000000000000000000000000000000000000000000000000000FFF
        );
        twoSlots3x4[0][1] = TwoSlots(
            0xAF0000000000000000000000000000000000000000000000000000000000000F,
            0xAF0000000F0000000000000000000000000000000000000000000000000000FF
        );
        twoSlots3x4[0][2] = TwoSlots(
            0xABC0000000000000000000000000000000000000000000000000000000000321,
            0xABC000000F000000000000000000000000000000000000000000000000000456
        );
        twoSlots3x4[1][0] = TwoSlots(
            0xDEF0000000000000000000000000F000000000000000000000000000000000F1,
            0xDEF000000F000000000000000000F00000000000000000000000000000000FF1
        );
        twoSlots3x4[1][1] = TwoSlots(
            0x1000000000000000000000000000F00000000000000000000000000000000001,
            0x300000000F000000000000000000F00000000000000000000000000000000003
        );
        twoSlots3x4[3][2] = TwoSlots(
            0xB00000000000000000000000000000000000000000000000000000F00000000D,
            0xF00000000F00000000000000000000000000000000000000000000F00000000F
        );

        twoSlots3xDyn.push();
        twoSlots3xDyn[0][0] = TwoSlots(
            0xF00000000000000000000000000000000000000000000000000000000000000F,
            0xF0000000F00000000000000000000000000000000000000000000000000000FF
        );
        twoSlots3xDyn[0][1] = TwoSlots(
            0xFF00000000000000000F0000000000000000000000000000000000000000000F,
            0xFF000000F0000000000F000000000000000000000000000000000000000000FF
        );

        testAddress = address(this);
    }

    function setTestString(string memory _testStr) public {
        testString = _testStr;
    }

    function setTestBytes(bytes memory _testBytes) public {
        testBytes = _testBytes;
    }

    function setTestUint256(uint256 _testUint256) public {
        testUint256 = _testUint256;
    }

    function setTestInt256(int256 _testInt256) public {
        testInt256 = _testInt256;
    }

    function setTestAddress(address _testAddress) public {
        testAddress = _testAddress;
    }
}
