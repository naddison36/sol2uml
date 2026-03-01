pragma solidity ^0.8.6;

import './libraries/BigInt.sol';
import './libraries/Set.sol';
import {ImportedFileLevelStruct, ImportedFileLevelStructAliased as IFLSA, ImportedTypesInContract, ImportedInterfaceWithStruct, ImportedParentContract, ImportedTypesAliasedContract as ITAS} from './ImportedTypes.sol';

interface ConstructorParamInterface {
    function someFunction() external returns (bool);
}

abstract contract ConstructorParamAbstract {
    string test = 'Abstract contract referenced by constructor parameter';

    function abstractFunction() public virtual returns (bool);

    function concreteFunction() public returns (string memory) {
        return test;
    }
}

contract ConstructorParamAssoc {
    string public test =
        'Concrete contract referenced by constructor parameter';
    string constructorAssoc;
}

interface FunctionParamInterface {
    function someFunction() external returns (bool);
}

abstract contract FunctionParamAbstract {
    string public test = 'Abstract contract referenced by function parameter';

    function abstractFunction() public virtual returns (bool);

    function concreteFunction() public returns (string memory) {
        return test;
    }
}

contract FunctionParamAssoc {
    string public test = 'Concrete contract referenced by function parameter';
}

contract FunctionReturnParamAssoc {
    string public test =
        'Concrete contract referenced by function return parameter';
}

contract ConstructorContract {
    constructor(uint256 value) {}
}

interface ContractInterface {
    function someFunction() external returns (bool);
}

abstract contract ContractAbstract {
    string public test = 'Abstract contract referenced by contract';

    function abstractFunction() public virtual returns (bool);

    function concreteFunction() public view returns (string memory) {
        return test;
    }
}

contract MappingConcrete {
    string test = 'Concrete contract referenced by mapping';
}

interface MappingInterface {
    function someFunction() external returns (string memory);
}

abstract contract MappingAbstract {
    string public test = 'Abstract contract referenced by mapping';

    function abstractFunction() public virtual returns (bool);

    function concreteFunction() public view returns (string memory) {
        return test;
    }
}

contract StructConcrete {
    string test = 'Concrete contract referenced by struct';
}

interface StructInterface {
    function someFunction() external returns (string memory);
}

abstract contract StructAbstract {
    string public test = 'Abstract contract referenced by struct';

    function abstractFunction() public virtual returns (bool);

    function concreteFunction() public view returns (string memory) {
        return test;
    }
}

contract MappingInStructConcrete {
    string test = 'Concrete contract referenced by mapping inside a struct';
}

contract ContractConcrete {
    string whatIsThis = 'Concrete contract';
}

contract ForLoopConcrete {
    uint256 public someNumber = 33;
}

contract WhileConcrete {
    uint256 public someNumber = 36;
}

contract DoWhileConcrete {
    uint256 public someNumber = 40;
}

contract IfTrueConcrete {
    uint256 public someNumber = 44;
}

contract IfFalseConcrete {
    uint256 public someNumber = 55;
}

contract BodyConcrete {
    uint256 public someNumber = 56;
}

contract NewConcrete {
    uint256 public someNumber = 57;
}

contract NewAddressConcrete {
    uint256 public someNumber = 58;
}

library VariableDeclarationLibrary {
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }
}

library ParamDeclarationLibrary {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a <= b ? a : b;
    }
}

library ConstructorDeclarationLibrary {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a <= b ? a : b;
    }
}

library LibraryWithStructUnlinked {
    struct LibStruct {
        address should;
        uint256 not;
        bool link;
    }
}

library LibraryWithStructLinked {
    struct LibStruct {
        address one;
        uint256 two;
        bool linked;
    }
}

library LibraryWithEnumUnlinked {
    enum LibEnum {
        should,
        not,
        link
    }
}

library LibraryWithEnumLinked {
    enum LibEnum {
        should,
        linked
    }

    enum unusedEnum {
        should,
        not,
        link
    }
}

interface InterfaceWithStructLinked {
    struct InterfaceStruct {
        address tester;
        uint256 counter;
    }
}

struct StructOfStruct {
    address owner;
    bool flag;
}

struct FileLevelStructUnlinked {
    address should;
    int8 not;
    bytes link;
}

struct FileLevelStructLinked {
    StructOfStruct structOfStruct;
}

struct FunctionParamStruct {
    address foo;
    address bar;
}

struct FunctionParamArrayStruct {
    uint256 foo;
    uint256 bar;
}

enum FileLevelStorageEnum {
    Green,
    Orange,
    Red
}

enum FileLevelMemoryEnum {
    Sent,
    Mined,
    Failed
}

uint256 constant FileConstant = 5;

contract ContractCalledViaStorageVariable {
    uint256 public someNumber = 99;

    function doSomething(uint256 limit) public returns (uint256) {
        return someNumber;
    }
}

contract InterfaceCalledViaStorageVariable {
    function deposit(uint256 amount, uint256 minAmount) public returns (uint256 shares);
}

abstract contract Associations is
    ContractInterface,
    ContractAbstract,
    ContractConcrete,
    InterfaceWithStructLinked,
    ImportedInterfaceWithStruct,
    ImportedParentContract,
    ITAS
{
    uint256 public someInt;

    uint256[] someIntArray;
    address[FileConstant] constantLengthArray;

    Set.Data structFromLib;
    SomeStruct structFromContract;
    FileLevelStructLinked fileLevelStruct;
    ImportedFileLevelStruct importedFileLevelStruct;
    IFLSA importedFileLevelStructAliased;
    ImportedTypesInContract.ImportedContractLevelStruct importedTypesInContract;
    InterfaceStruct interfaceStruct;
    ImportedInterfaceStruct importedInterfaceStruct;
    GrandStruct grandStruct;
    AliasedStruct aliasedStruct;
    AliasedEnum aliasedEnum;

    FileLevelStorageEnum fileLevelEnum;
    LibraryWithStructLinked.LibStruct libStruct;
    LibraryWithEnumLinked.LibEnum libEnum;

    SomeEnum someEnum;
    FileLevelStorageEnum fileLevelStorageEnum;

    mapping(address => MappingConcrete) public mappingConcreateReference;
    mapping(address => MappingInterface) public mappingInterfaceReference;
    mapping(address => MappingAbstract) public mappingAbstractReference;

    struct SomeStruct {
        StructConcrete structConcrete;
        StructInterface structInterface;
        StructAbstract structAbstract;
        mapping(address => MappingInStructConcrete) mappingInStructConcrete;
        StructInStruct structInStruct;
        uint256 count;
        mapping(address => string) names;
        mapping(address => StructInStructMapping) balances;
    }

    struct StructInStructMapping {
        bool active;
    }

    struct StructInStruct {
        bool active;
    }

    enum SomeEnum {
        Pending,
        Approve,
        Reject,
        Cancel,
        Processed
    }

    ContractCalledViaStorageVariable public contractCalledViaStorageVariable;
    InterfaceCalledViaStorageVariable public interfaceCalledViaStorageVariable;

    constructor(
        ConstructorParamAssoc constructorAssoc,
        ConstructorParamAbstract constructorAbstract,
        ConstructorParamInterface constructorInterface
    ) {
        someInt = 11;
    }

    function someFunction(
        FunctionParamAssoc paramAssoc,
        FunctionParamAbstract paramAbstract,
        FunctionParamInterface paramInterface,
        address bodyConcreteAddress
    ) public returns (FunctionReturnParamAssoc returnParamAssoc) {
        someInt = 22;

        NewConcrete newConcrete = new NewConcrete();
        NewAddressConcrete newAddressConcrete = new NewAddressConcrete();

        uint256 counter = 0;
        for (uint i = 0; i < someIntArray.length; i++) {
            ForLoopConcrete forLoopConcrete = new ForLoopConcrete();
            counter += someIntArray[i] + forLoopConcrete.someNumber();
        }

        if (counter > 5) {
            IfTrueConcrete ifTrueConcrete = new IfTrueConcrete();
            counter += ifTrueConcrete.someNumber();
        } else {
            IfFalseConcrete ifFalseConcrete = new IfFalseConcrete();
            counter += ifFalseConcrete.someNumber();

            while (counter < 100) {
                WhileConcrete whileConcrete = new WhileConcrete();
                counter += whileConcrete.someNumber();
            }

            do {
                DoWhileConcrete doWhileConcrete = new DoWhileConcrete();
                counter += doWhileConcrete.someNumber();
            } while (counter < 200);
        }

        BodyConcrete(bodyConcreteAddress);

        uint256 varRef = VariableDeclarationLibrary.max(1, 2);
        require(varRef > 10, 'Testing associations of varible declaration');
    }

    using BigInt for BigInt.bigint;

    function someBigIntFunction() public pure {
        BigInt.bigint memory x = BigInt.fromUint(7);
        BigInt.bigint memory y = BigInt.fromUint(type(uint256).max);
        BigInt.bigint memory z = x.add(y);
        assert(z.limb(1) > 0);
    }

    function usingStructs(
        SomeStruct storage someStructParam,
        SomeStruct[] storage someStructArray
    ) internal returns (SomeStruct[] storage) {
        return someStructArray;
    }

    function usingEnum(FileLevelMemoryEnum status) public {}

    function usingStruct(FunctionParamStruct memory param) public {}

    function usingStructArray(
        FunctionParamArrayStruct[] memory params
    ) public {}

    function internalCalc(uint256 input) internal {}

    function callInternalCalcUsingLibFunction() public {
        internalCalc(ParamDeclarationLibrary.min(1, 2));
    }

    function createContractUsingLibFunction() private {
        new ConstructorContract(ConstructorDeclarationLibrary.min(2, 3));
    }

    function callContractCalledViaStorageVariable() public returns (uint256) {
        return contractCalledViaStorageVariable.doSomething();
    }

    function callInterfaceCalledViaStorageVariable(uint256 amount, uint256 minAmount) public returns (uint256) {
        return interfaceCalledViaStorageVariable.deposit(amount, minAmount);
    }
}
