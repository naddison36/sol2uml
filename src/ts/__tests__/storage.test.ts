import {
    Attribute,
    AttributeType,
    ClassProperties,
    ClassStereotype,
    UmlClass,
} from '../umlClass'
import {
    calcSlotKey,
    calcStorageByteSize,
    isElementary,
} from '../converterClasses2Storage'
import { formatBytes32String, parseBytes32String } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'

describe('storage parser', () => {
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
            type         | expected
            ${'address'} | ${20}
            ${'bool'}    | ${1}
            ${'int'}     | ${32}
            ${'uint'}    | ${32}
            ${'int256'}  | ${32}
            ${'uint256'} | ${32}
            ${'uint8'}   | ${1}
            ${'int8'}    | ${1}
            ${'uint32'}  | ${4}
            ${'int32'}   | ${4}
            ${'bytes'}   | ${32}
            ${'bytes32'} | ${32}
            ${'bytes1'}  | ${1}
            ${'bytes31'} | ${31}
            ${'string'}  | ${32}
        `('elementary type $type', ({ type, expected }) => {
            const umlClass = new UmlClass(defaultClassProperties)
            const attribute: Attribute = {
                attributeType: AttributeType.Elementary,
                type,
                name: 'varName',
            }
            const { size } = calcStorageByteSize(attribute, umlClass, [])
            expect(size).toEqual(expected)
        })

        // TODO implement support for sizing expressions. eg
        // ${'address[N_COINS * 2]'}      | ${128}
        test.each`
            type                           | expected
            ${'address[]'}                 | ${32}
            ${'address[1]'}                | ${32}
            ${'address[2]'}                | ${64}
            ${'address[3]'}                | ${96}
            ${'address[4]'}                | ${128}
            ${'address[2][2]'}             | ${128}
            ${'address[32]'}               | ${1024}
            ${'address[][2]'}              | ${64}
            ${'address[2][]'}              | ${32}
            ${'address[][10]'}             | ${320}
            ${'address[][][2]'}            | ${64}
            ${'address[][4][3]'}           | ${384}
            ${'address[][3][][2]'}         | ${64}
            ${'address[3][2][]'}           | ${32}
            ${'address[][2][2][2]'}        | ${256}
            ${'address[][2][]'}            | ${32}
            ${'address[N_COINS]'}          | ${64}
            ${'address[N_COINS][N_COINS]'} | ${128}
            ${'IERC20[]'}                  | ${32}
            ${'IERC20[1]'}                 | ${32}
            ${'IERC20[2]'}                 | ${64}
            ${'IERC20[3]'}                 | ${96}
            ${'IERC20[4]'}                 | ${128}
            ${'uint8[33][2][2]'}           | ${256}
            ${'bytes32[]'}                 | ${32}
            ${'bytes1[1]'}                 | ${32}
            ${'bytes1[2]'}                 | ${32}
            ${'bytes1[16]'}                | ${32}
            ${'bytes1[17]'}                | ${32}
            ${'bytes1[32]'}                | ${32}
            ${'bytes1[33]'}                | ${64}
            ${'bytes16[2]'}                | ${32}
            ${'bytes17[2]'}                | ${64}
            ${'bytes30[2]'}                | ${64}
            ${'bytes30[6][2]'}             | ${384}
            ${'bytes30[2][6]'}             | ${384}
            ${'bytes128[4]'}               | ${512}
            ${'bytes256[2]'}               | ${512}
            ${'bytes256[]'}                | ${32}
            ${'bytes32[1]'}                | ${32}
            ${'bytes32[2]'}                | ${64}
            ${'bool[1]'}                   | ${32}
            ${'bool[16]'}                  | ${32}
            ${'bool[32]'}                  | ${32}
            ${'bool[33]'}                  | ${64}
            ${'bool[2][3]'}                | ${3 * 32}
            ${'bool[3][2]'}                | ${2 * 32}
            ${'bool[2][]'}                 | ${32}
            ${'bool[][2]'}                 | ${2 * 32}
            ${'bool[][16]'}                | ${16 * 32}
            ${'bool[][32]'}                | ${32 * 32}
            ${'bool[][33]'}                | ${33 * 32}
            ${'bool[33][3]'}               | ${3 * 2 * 32}
            ${'bool[][2][3]'}              | ${3 * 2 * 32}
            ${'bool[][][2][3]'}            | ${3 * 2 * 32}
            ${'bool[][2][]'}               | ${32}
            ${'bool[][][3]'}               | ${3 * 32}
            ${'bool[33][2]'}               | ${2 * 2 * 32}
            ${'bool[33][2][2]'}            | ${2 * 2 * 2 * 32}
            ${'bool[][4][3]'}              | ${3 * 4 * 32}
            ${'bool[][64][64]'}            | ${64 * 64 * 32}
            ${'bool[64][][64]'}            | ${64 * 32}
            ${'bool[64][64][]'}            | ${32}
            ${'uint120[2]'}                | ${32}
            ${'uint120[3]'}                | ${64}
            ${'uint120[4]'}                | ${64}
            ${'uint120[6]'}                | ${96}
            ${'TwoSlots[3][4]'}            | ${4 * 3 * 2 * 32}
            ${'TwoSlots[4][3]'}            | ${3 * 4 * 2 * 32}
            ${'TwoSlots[][3]'}             | ${3 * 32}
            ${'TwoSlots[3][]'}             | ${32}
            ${'TwoSlots[][]'}              | ${32}
            ${'TwoSlots[][4][3]'}          | ${3 * 4 * 32}
            ${'TwoSlots[4][3][]'}          | ${32}
        `('array type $type', ({ type, expected }) => {
            const umlCLass = new UmlClass(defaultClassProperties)
            const attribute: Attribute = {
                attributeType: AttributeType.Array,
                type,
                name: 'arrayName',
            }
            const { size } = calcStorageByteSize(
                attribute,
                umlCLass,
                otherClasses
            )
            expect(size).toEqual(expected)
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
                ${['address', 'address', 'address']}                      | ${96}
                ${['address', 'bytes12', 'bytes12', 'address']}           | ${64}
                ${['IERC20']}                                             | ${32}
                ${['IERC20', 'IERC20', 'IERC20']}                         | ${96}
                ${['IERC20[2]']}                                          | ${64}
                ${['IERC20[3]']}                                          | ${96}
                ${['IERC20[2]', 'IERC20[]']}                              | ${96}
                ${['IERC20[2]', 'IERC20[3]']}                             | ${160}
                ${['IERC20', 'bytes12', 'bytes12', 'IERC20']}             | ${64}
                ${['bytes31', 'bytes2', 'bytes31']}                       | ${96}
                ${['uint256', 'bytes32']}                                 | ${64}
                ${['bool', 'uint8']}                                      | ${32}
                ${['bool[12]', 'uint8[12]']}                              | ${64}
                ${['bytes30', 'bytes30', 'bytes30']}                      | ${96}
                ${['uint256[]', 'bytes32[2]']}                            | ${96}
                ${['uint256[2]', 'bytes32[2]']}                           | ${128}
                ${['bool', 'bool[2]', 'bool']}                            | ${96}
                ${['bool', 'bool[33]', 'bool']}                           | ${128}
                ${['uint16', 'bytes30[2]', 'uint16']}                     | ${128}
                ${['ContractLevelStruct0']}                               | ${64}
                ${['ContractLevelStruct1']}                               | ${64}
                ${['ContractLevelStruct2']}                               | ${192}
                ${['ContractLevelStruct2[2]', 'address']}                 | ${416}
                ${['ContractLevelStruct0', 'ContractLevelStruct1']}       | ${128}
                ${['ContractLevelStruct0[]', 'address']}                  | ${64}
                ${['ContractLevelStruct1[2]', 'address']}                 | ${160}
                ${['ContractLevelStruct1[2]', 'ContractLevelStruct0[3]']} | ${320}
                ${['ContractLevelStruct2[]', 'address']}                  | ${64}
                ${['address', 'ContractLevelStruct2[]']}                  | ${64}
                ${['bool', 'ContractLevelStruct0', 'bool']}               | ${128}
                ${['enum0']}                                              | ${32}
                ${['enum0', 'enum1']}                                     | ${32}
                ${['enum0', 'enum1', 'bytes30']}                          | ${32}
                ${['enum0', 'enum1', 'bytes31']}                          | ${64}
                ${['enum0', 'enum1', 'bytes30[2]']}                       | ${96}
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
                const { size } = calcStorageByteSize(attribute, umlCLass, [
                    ...otherClasses,
                    testStruct,
                ])
                expect(size).toEqual(expected)
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
    describe.only('calc dynamic array starting slot', () => {
        const variable = {
            id: 0,
            toSlot: 2,
            byteSize: 32,
            byteOffset: 0,
            type: 'array',
            dynamic: true,
            noValue: false,
        }
        test.each`
            slot                 | expected
            ${1}                 | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${BigNumber.from(1)} | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${'1'}               | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
            ${'0x01'}            | ${'0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'}
        `('slot $slot', ({ slot, expected }) => {
            expect(calcSlotKey({ ...variable, fromSlot: slot })).toEqual(
                expected
            )
        })
    })
})
