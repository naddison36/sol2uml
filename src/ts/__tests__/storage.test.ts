import {
    Attribute,
    AttributeType,
    ClassProperties,
    ClassStereotype,
    UmlClass,
} from '../umlClass'
import {
    calcSectionOffset,
    calcStorageByteSize,
    isElementary,
} from '../converterClasses2Storage'
import { formatBytes32String, parseBytes32String } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'

describe('storage parser', () => {
    describe('is elementary type?', () => {
        test.each`
            type                                        | expected
            ${'address'}                                | ${true}
            ${'bool'}                                   | ${true}
            ${'int'}                                    | ${true}
            ${'uint'}                                   | ${true}
            ${'int256'}                                 | ${true}
            ${'uint256'}                                | ${true}
            ${'uint8'}                                  | ${true}
            ${'int8'}                                   | ${true}
            ${'uint32'}                                 | ${true}
            ${'int32'}                                  | ${true}
            ${'bytes'}                                  | ${true}
            ${'bytes32'}                                | ${true}
            ${'bytes1'}                                 | ${true}
            ${'bytes31'}                                | ${true}
            ${'string'}                                 | ${true}
            ${'address[]'}                              | ${false}
            ${'address[2]'}                             | ${false}
            ${'bool[]'}                                 | ${false}
            ${'bool[MAX]'}                              | ${false}
            ${'int8[]'}                                 | ${false}
            ${'int8[10]'}                               | ${false}
            ${'mapping(address=>uint256)'}              | ${false}
            ${'mapping(address=>ContractLevelStruct2)'} | ${false}
            ${'IERC20'}                                 | ${false}
        `('$type', ({ type, expected }) => {
            expect(isElementary(type)).toEqual(expected)
        })
    })
    describe('calc storage bytes size of', () => {
        const defaultClassProperties: ClassProperties = {
            name: 'test',
            absolutePath: '/',
            relativePath: '.',
            constants: [
                {
                    name: 'N_COINS',
                    value: 2,
                },
            ],
        }
        const otherClasses: UmlClass[] = [
            new UmlClass({
                ...defaultClassProperties,
                stereotype: ClassStereotype.Struct,
                name: 'TwoSlots',
                attributes: [
                    {
                        name: 'param1',
                        type: 'uint256',
                        attributeType: AttributeType.Elementary,
                    },
                    {
                        name: 'param2',
                        type: 'address',
                        attributeType: AttributeType.Elementary,
                    },
                ],
            }),
            new UmlClass({
                ...defaultClassProperties,
                stereotype: ClassStereotype.Interface,
                name: 'IERC20',
            }),
        ]
        test.each`
            type         | expectedSize | expectedDynamic
            ${'address'} | ${20}        | ${false}
            ${'bool'}    | ${1}         | ${false}
            ${'int'}     | ${32}        | ${false}
            ${'uint'}    | ${32}        | ${false}
            ${'int256'}  | ${32}        | ${false}
            ${'uint256'} | ${32}        | ${false}
            ${'uint8'}   | ${1}         | ${false}
            ${'int8'}    | ${1}         | ${false}
            ${'uint32'}  | ${4}         | ${false}
            ${'int32'}   | ${4}         | ${false}
            ${'bytes'}   | ${32}        | ${true}
            ${'bytes32'} | ${32}        | ${false}
            ${'bytes1'}  | ${1}         | ${false}
            ${'bytes31'} | ${31}        | ${false}
            ${'string'}  | ${32}        | ${true}
        `(
            'elementary type $type',
            ({ type, expectedSize, expectedDynamic }) => {
                const umlClass = new UmlClass(defaultClassProperties)
                const attribute: Attribute = {
                    attributeType: AttributeType.Elementary,
                    type,
                    name: 'varName',
                }
                const { size, dynamic } = calcStorageByteSize(
                    attribute,
                    umlClass,
                    []
                )
                expect(size).toEqual(expectedSize)
                expect(dynamic).toEqual(expectedDynamic)
            }
        )

        // TODO implement support for sizing expressions. eg
        // ${'address[N_COINS * 2]'}      | ${128}
        test.each`
            type                           | expectedSize      | expectedDynamic
            ${'address[]'}                 | ${32}             | ${true}
            ${'address[1]'}                | ${32}             | ${false}
            ${'address[2]'}                | ${64}             | ${false}
            ${'address[3]'}                | ${96}             | ${false}
            ${'address[4]'}                | ${128}            | ${false}
            ${'address[2][2]'}             | ${128}            | ${false}
            ${'address[32]'}               | ${1024}           | ${false}
            ${'address[][2]'}              | ${64}             | ${false}
            ${'address[2][]'}              | ${32}             | ${true}
            ${'address[][10]'}             | ${320}            | ${false}
            ${'address[][][2]'}            | ${64}             | ${false}
            ${'address[][4][3]'}           | ${384}            | ${false}
            ${'address[][3][][2]'}         | ${64}             | ${false}
            ${'address[3][2][]'}           | ${32}             | ${true}
            ${'address[][2][2][2]'}        | ${256}            | ${false}
            ${'address[][2][]'}            | ${32}             | ${true}
            ${'address[N_COINS]'}          | ${64}             | ${false}
            ${'address[N_COINS][N_COINS]'} | ${128}            | ${false}
            ${'IERC20[]'}                  | ${32}             | ${true}
            ${'IERC20[1]'}                 | ${32}             | ${false}
            ${'IERC20[2]'}                 | ${64}             | ${false}
            ${'IERC20[3]'}                 | ${96}             | ${false}
            ${'IERC20[4]'}                 | ${128}            | ${false}
            ${'uint8[33][2][2]'}           | ${256}            | ${false}
            ${'bytes32[]'}                 | ${32}             | ${true}
            ${'bytes1[1]'}                 | ${32}             | ${false}
            ${'bytes1[2]'}                 | ${32}             | ${false}
            ${'bytes1[16]'}                | ${32}             | ${false}
            ${'bytes1[17]'}                | ${32}             | ${false}
            ${'bytes1[32]'}                | ${32}             | ${false}
            ${'bytes1[33]'}                | ${64}             | ${false}
            ${'bytes16[2]'}                | ${32}             | ${false}
            ${'bytes17[2]'}                | ${64}             | ${false}
            ${'bytes30[2]'}                | ${64}             | ${false}
            ${'bytes30[6][2]'}             | ${384}            | ${false}
            ${'bytes30[2][6]'}             | ${384}            | ${false}
            ${'bytes128[4]'}               | ${512}            | ${false}
            ${'bytes256[2]'}               | ${512}            | ${false}
            ${'bytes256[]'}                | ${32}             | ${true}
            ${'bytes32[1]'}                | ${32}             | ${false}
            ${'bytes32[2]'}                | ${64}             | ${false}
            ${'bool[1]'}                   | ${32}             | ${false}
            ${'bool[16]'}                  | ${32}             | ${false}
            ${'bool[32]'}                  | ${32}             | ${false}
            ${'bool[33]'}                  | ${64}             | ${false}
            ${'bool[2][3]'}                | ${3 * 32}         | ${false}
            ${'bool[3][2]'}                | ${2 * 32}         | ${false}
            ${'bool[2][]'}                 | ${32}             | ${true}
            ${'bool[][2]'}                 | ${2 * 32}         | ${false}
            ${'bool[][16]'}                | ${16 * 32}        | ${false}
            ${'bool[][32]'}                | ${32 * 32}        | ${false}
            ${'bool[][33]'}                | ${33 * 32}        | ${false}
            ${'bool[33][3]'}               | ${3 * 2 * 32}     | ${false}
            ${'bool[][2][3]'}              | ${3 * 2 * 32}     | ${false}
            ${'bool[][][2][3]'}            | ${3 * 2 * 32}     | ${false}
            ${'bool[][2][]'}               | ${32}             | ${true}
            ${'bool[][][3]'}               | ${3 * 32}         | ${false}
            ${'bool[33][2]'}               | ${2 * 2 * 32}     | ${false}
            ${'bool[33][2][2]'}            | ${2 * 2 * 2 * 32} | ${false}
            ${'bool[][4][3]'}              | ${3 * 4 * 32}     | ${false}
            ${'bool[][64][64]'}            | ${64 * 64 * 32}   | ${false}
            ${'bool[64][][64]'}            | ${64 * 32}        | ${false}
            ${'bool[64][64][]'}            | ${32}             | ${true}
            ${'uint120[2]'}                | ${32}             | ${false}
            ${'uint120[3]'}                | ${64}             | ${false}
            ${'uint120[4]'}                | ${64}             | ${false}
            ${'uint120[6]'}                | ${96}             | ${false}
            ${'TwoSlots[3][4]'}            | ${4 * 3 * 2 * 32} | ${false}
            ${'TwoSlots[4][3]'}            | ${3 * 4 * 2 * 32} | ${false}
            ${'TwoSlots[][3]'}             | ${3 * 32}         | ${false}
            ${'TwoSlots[3][]'}             | ${32}             | ${true}
            ${'TwoSlots[][]'}              | ${32}             | ${true}
            ${'TwoSlots[][4][3]'}          | ${3 * 4 * 32}     | ${false}
            ${'TwoSlots[4][3][]'}          | ${32}             | ${true}
            ${'uint56[21]'}                | ${32 * 6}         | ${false}
            ${'uint72[7]'}                 | ${32 * 3}         | ${false}
        `('array type $type', ({ type, expectedSize, expectedDynamic }) => {
            const umlCLass = new UmlClass(defaultClassProperties)
            const attribute: Attribute = {
                attributeType: AttributeType.Array,
                type,
                name: 'arrayName',
            }
            const { size, dynamic } = calcStorageByteSize(
                attribute,
                umlCLass,
                otherClasses
            )
            expect(size).toEqual(expectedSize)
            expect(dynamic).toEqual(expectedDynamic)
        })
        describe('structs', () => {
            const otherClasses: UmlClass[] = [
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct0',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'uint256',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param2',
                            type: 'bool',
                            attributeType: AttributeType.Elementary,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct1',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'uint256',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param2',
                            type: 'address',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param3',
                            type: 'uint8',
                            attributeType: AttributeType.Elementary,
                        },
                        {
                            name: 'param4',
                            type: 'bytes1',
                            attributeType: AttributeType.Elementary,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Struct,
                    name: 'ContractLevelStruct2',
                    attributes: [
                        {
                            name: 'param1',
                            type: 'ContractLevelStruct0',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'param2',
                            type: 'ContractLevelStruct1[2]',
                            attributeType: AttributeType.Array,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Enum,
                    name: 'enum0',
                    attributes: [
                        {
                            name: 'start',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'stop',
                            attributeType: AttributeType.UserDefined,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Enum,
                    name: 'enum1',
                    attributes: [
                        {
                            name: 'red',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'orange',
                            attributeType: AttributeType.UserDefined,
                        },
                        {
                            name: 'green',
                            attributeType: AttributeType.UserDefined,
                        },
                    ],
                }),
                new UmlClass({
                    ...defaultClassProperties,
                    stereotype: ClassStereotype.Interface,
                    name: 'IERC20',
                }),
            ]
            test.each`
                types                                                     | expected
                ${['address', 'address', 'address']}                      | ${32 + 32 + 32}
                ${['address', 'bytes12', 'bytes12', 'address']}           | ${32 + 32}
                ${['IERC20']}                                             | ${32}
                ${['IERC20', 'IERC20', 'IERC20']}                         | ${32 * 3}
                ${['IERC20[2]']}                                          | ${32 * 2}
                ${['IERC20[3]']}                                          | ${32 * 3}
                ${['IERC20[2]', 'IERC20[]']}                              | ${32 * 2 + 32}
                ${['IERC20[2]', 'IERC20[3]']}                             | ${32 * 2 + 32 * 3}
                ${['IERC20', 'bytes12', 'bytes12', 'IERC20']}             | ${64}
                ${['bytes31', 'bytes2', 'bytes31']}                       | ${96}
                ${['uint256', 'bytes32']}                                 | ${64}
                ${['bool', 'uint8']}                                      | ${32}
                ${['bool[12]', 'uint8[12]']}                              | ${64}
                ${['bytes30', 'bytes30', 'bytes30']}                      | ${96}
                ${['uint256[]', 'bytes32[2]']}                            | ${96}
                ${['uint256[2]', 'bytes32[2]']}                           | ${32 * 2 + 32 * 2}
                ${['bool', 'bool[2]', 'bool']}                            | ${32 + 32 + 32}
                ${['bool', 'bool[33]', 'bool']}                           | ${32 + 64 + 32}
                ${['uint16', 'bytes30[2]', 'uint16']}                     | ${32 + 64 + 32}
                ${['ContractLevelStruct0']}                               | ${64}
                ${['ContractLevelStruct1']}                               | ${64}
                ${['ContractLevelStruct2']}                               | ${32 * 6}
                ${['ContractLevelStruct2[2]', 'address']}                 | ${32 * 6 * 2 + 32}
                ${['ContractLevelStruct0', 'ContractLevelStruct1']}       | ${64 + 64}
                ${['ContractLevelStruct0[]', 'address']}                  | ${64}
                ${['ContractLevelStruct1[2]', 'address']}                 | ${64 * 2 + 32}
                ${['ContractLevelStruct1[2]', 'ContractLevelStruct0[3]']} | ${64 * 2 + 64 * 3}
                ${['ContractLevelStruct2[]', 'address']}                  | ${32 + 32}
                ${['address', 'ContractLevelStruct2[]']}                  | ${32 + 32}
                ${['bool', 'ContractLevelStruct0', 'bool']}               | ${32 + 64 + 32}
                ${['enum0']}                                              | ${32}
                ${['enum0', 'enum1']}                                     | ${32}
                ${['enum0', 'enum1', 'bytes30']}                          | ${32}
                ${['enum0', 'enum1', 'bytes31']}                          | ${64}
                ${['enum0', 'enum1', 'bytes30[2]']}                       | ${32 + 32 * 2}
                ${['bool', 'enum0', 'bool']}                              | ${32}
            `('struct with types $types', ({ types, expected }) => {
                const testAttributes: Attribute[] = []
                types.forEach((type: string, i: number) => {
                    const attributeType =
                        type.slice(-1) === ']'
                            ? AttributeType.Array
                            : isElementary(type)
                            ? AttributeType.Elementary
                            : AttributeType.UserDefined
                    testAttributes.push({
                        name: `test ${i}`,
                        type,
                        attributeType,
                    })
                })
                const testStruct = new UmlClass({
                    ...defaultClassProperties,
                    name: 'ContractLevelStruct',
                    stereotype: ClassStereotype.Struct,
                    attributes: testAttributes,
                })
                const umlCLass = new UmlClass({
                    ...defaultClassProperties,
                })
                const attribute: Attribute = {
                    attributeType: AttributeType.UserDefined,
                    type: 'ContractLevelStruct',
                    name: 'structName',
                }
                const { size, dynamic } = calcStorageByteSize(
                    attribute,
                    umlCLass,
                    [...otherClasses, testStruct]
                )
                expect(size).toEqual(expected)
                expect(dynamic).toEqual(false)
            })
        })
    })
    describe('strings', () => {
        it('bytes to string', () => {
            expect(
                parseBytes32String(
                    '0x5465737453746f7261676520636f6e7472616374000000000000000000000000'
                )
            ).toEqual('TestStorage contract')
        })
        it('string to bytes', () => {
            expect(formatBytes32String('Less than 31 bytes')).toEqual(
                '0x4c657373207468616e2033312062797465730000000000000000000000000000'
            )
        })
    })
    describe('calc dynamic array starting slot', () => {
        const variable = {
            id: 0,
            toSlot: 2,
            byteSize: 32,
            byteOffset: 0,
            type: 'array',
            attributeType: AttributeType.Array,
            dynamic: true,
            getValue: false,
            displayValue: false,
        }
        test.each`
            slot                 | expected
            ${1}                 | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${BigNumber.from(1)} | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${'1'}               | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${'0x01'}            | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
        `('slot $slot', ({ slot, expected }) => {
            expect(calcSectionOffset({ ...variable, fromSlot: slot })).toEqual(
                expected
            )
        })
    })
})
