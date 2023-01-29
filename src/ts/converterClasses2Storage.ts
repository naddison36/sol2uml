import { Attribute, AttributeType, ClassStereotype, UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'
import { getStorageValues } from './slotValues'
import { hexZeroPad, keccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import path from 'path'
import { BigNumberish } from '@ethersproject/bignumber'

const debug = require('debug')('sol2uml')

export enum StorageSectionType {
    Contract = 'Contract',
    Struct = 'Struct',
    Array = 'Array',
}

export interface Variable {
    id: number
    fromSlot: number
    toSlot: number
    byteSize: number
    byteOffset: number
    type: string
    attributeType: AttributeType
    dynamic: boolean
    variable?: string
    contractName?: string
    getValue: boolean
    value?: string
    referenceSectionId?: number
    enumId?: number
}

export interface StorageSection {
    id: number
    name: string
    address?: string
    offset?: string
    type: StorageSectionType
    arrayLength?: number
    arrayDynamic?: boolean
    variables: Variable[]
}

let storageId = 1
let variableId = 1

/**
 *
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If contract is proxied, use proxy and not the implementation contract.
 * @param storageSection is mutated with the storage values
 * @param blockTag block number or `latest`
 */
export const addStorageValues = async (
    url: string,
    contractAddress: string,
    storageSection: StorageSection,
    blockTag?: BigNumberish | 'latest'
) => {
    const valueVariables = storageSection.variables.filter((ss) => ss.getValue)
    if (valueVariables.length === 0) return

    const valueFromSlot = valueVariables.map((variable) => variable.fromSlot)
    // remove duplicate slots
    const uniqueValueFromSlot = [...new Set(valueFromSlot)]

    // Convert slot numbers to BigNumbers and offset dynamic arrays
    let slots = uniqueValueFromSlot.map((fromSlot) => {
        if (storageSection.offset) {
            return BigNumber.from(storageSection.offset).add(fromSlot)
        }
        return BigNumber.from(fromSlot)
    })

    // Get the contract slot values from the node provider
    const values = await getStorageValues(url, contractAddress, slots, blockTag)

    // For each slot value retrieved
    values.forEach((value, i) => {
        // Get the corresponding slot number for the slot value
        const fromSlot = uniqueValueFromSlot[i]

        // For each variable in the storage section
        for (const variable of storageSection.variables) {
            if (variable.fromSlot === fromSlot) {
                variable.value = value
            }
            // if variable is past the slot that has the value
            else if (variable.toSlot > fromSlot) {
                break
            }
        }
    })
}

/**
 *
 * @param contractName name of the contract to get storage layout.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
export const convertClasses2StorageSections = (
    contractName: string,
    umlClasses: UmlClass[],
    contractFilename?: string
): StorageSection[] => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name, relativePath }) => {
        if (!contractFilename) {
            return name === contractName
        }
        return (
            name === contractName &&
            (relativePath == path.normalize(contractFilename) ||
                path.basename(relativePath) ===
                    path.normalize(contractFilename))
        )
    })
    if (!umlClass) {
        const contractFilenameError = contractFilename
            ? ` in filename "${contractFilename}"`
            : ''
        throw Error(
            `Failed to find contract with name "${contractName}"${contractFilenameError}.\nIs the \`-c --contract <name>\` option correct?`
        )
    }
    debug(`Found contract "${contractName}" in ${umlClass.absolutePath}`)

    const storageSections: StorageSection[] = []
    const variables = parseVariables(
        umlClass,
        umlClasses,
        [],
        storageSections,
        []
    )

    // Add new storage section to the beginning of the array
    storageSections.unshift({
        id: storageId++,
        name: contractName,
        type: StorageSectionType.Contract,
        variables: variables,
    })

    processReferenceStorageSections(storageSections[0], 0, storageSections)

    return storageSections
}

/**
 * Recursively parses the storage variables for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storageSections mutable array of storageSection objects
 */
const parseVariables = (
    umlClass: UmlClass,
    umlClasses: UmlClass[],
    variables: Variable[],
    storageSections: StorageSection[],
    inheritedContracts: string[]
): Variable[] => {
    // Add storage slots from inherited contracts first.
    // Get immediate parent contracts that the class inherits from
    const parentContracts = umlClass.getParentContracts()
    // Filter out any already inherited contracts
    const newInheritedContracts = parentContracts.filter(
        (parentContract) =>
            !inheritedContracts.includes(parentContract.targetUmlClassName)
    )
    // Mutate inheritedContracts to include the new inherited contracts
    inheritedContracts.push(
        ...newInheritedContracts.map((c) => c.targetUmlClassName)
    )
    // Recursively parse each new inherited contract
    newInheritedContracts.forEach((parent) => {
        const parentClass = findAssociatedClass(parent, umlClass, umlClasses)
        if (!parentClass) {
            throw Error(
                `Failed to find inherited contract "${parent.targetUmlClassName}" of "${umlClass.absolutePath}"`
            )
        }
        // recursively parse inherited contract
        parseVariables(
            parentClass,
            umlClasses,
            variables,
            storageSections,
            inheritedContracts
        )
    })

    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled) return

        const { size: byteSize, dynamic } = calcStorageByteSize(
            attribute,
            umlClass,
            umlClasses
        )

        // find any dependent storage section locations
        const referenceStorageSection = parseReferenceStorageSection(
            attribute,
            umlClass,
            umlClasses,
            storageSections
        )

        const getValue = calcGetValue(
            attribute.attributeType,
            dynamic,
            referenceStorageSection?.type
        )

        // Get the toSlot of the last storage item
        let lastToSlot = 0
        let nextOffset = 0
        if (variables.length > 0) {
            const lastVariable = variables[variables.length - 1]
            lastToSlot = lastVariable.toSlot
            nextOffset = lastVariable.byteOffset + lastVariable.byteSize
        }
        let newVariable: Variable
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0
            newVariable = {
                id: variableId++,
                fromSlot: nextFromSlot,
                toSlot: nextFromSlot + Math.floor((byteSize - 1) / 32),
                byteSize,
                byteOffset: 0,
                type: attribute.type,
                attributeType: attribute.attributeType,
                dynamic,
                getValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceSectionId: referenceStorageSection?.id,
            }
        } else {
            newVariable = {
                id: variableId++,
                fromSlot: lastToSlot,
                toSlot: lastToSlot,
                byteSize,
                byteOffset: nextOffset,
                type: attribute.type,
                attributeType: attribute.attributeType,
                dynamic,
                getValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceSectionId: referenceStorageSection?.id,
            }
        }
        variables.push(newVariable)
    })

    return variables
}

const processReferenceStorageSections = (
    storageSection: StorageSection,
    slotOffset: number,
    storageSections: StorageSection[]
) => {
    // storageSection.offset = 0
    storageSection.variables.forEach((variable) => {
        // offset storage slots
        variable.fromSlot += slotOffset
        variable.toSlot += slotOffset

        // find storage section that the variable is referencing
        const referenceStorageSection = storageSections.find(
            (ss) => ss.id === variable.referenceSectionId
        )

        if (referenceStorageSection) {
            referenceStorageSection.offset = storageSection.offset

            if (!variable.dynamic) {
                processReferenceStorageSections(
                    referenceStorageSection,
                    variable.fromSlot,
                    storageSections
                )
            } else if (variable.attributeType === AttributeType.Array) {
                // attribute is a dynamic array
                referenceStorageSection.offset = calcSectionOffset(variable)

                processReferenceStorageSections(
                    referenceStorageSection,
                    0,
                    storageSections
                )
            }
        }
    })
}

export const parseReferenceStorageSection = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: UmlClass[],
    storageSections: StorageSection[]
): StorageSection | undefined => {
    if (attribute.attributeType === AttributeType.Array) {
        // storage is dynamic if the attribute type ends in []
        const result = attribute.type.match(/\[(\w*)]$/)
        const dynamic = result[1] === ''
        const arrayLength = !dynamic
            ? findDimensionLength(umlClass, result[1], otherClasses)
            : undefined

        // get the type of the array items. eg
        // address[][4][2] will have base type address[][4]
        const baseType = attribute.type.substring(
            0,
            attribute.type.lastIndexOf('[')
        )
        let baseAttributeType: AttributeType
        if (isElementary(baseType)) {
            baseAttributeType = AttributeType.Elementary
        } else if (baseType[baseType.length - 1] === ']') {
            baseAttributeType = AttributeType.Array
        } else {
            baseAttributeType = AttributeType.UserDefined
        }

        const baseAttribute: Attribute = {
            visibility: attribute.visibility,
            name: baseType,
            type: baseType,
            attributeType: baseAttributeType,
        }
        const { size: arrayItemSize } = calcStorageByteSize(
            baseAttribute,
            umlClass,
            otherClasses
        )
        // If more than 16 bytes, then round up in 32 bytes increments
        const arraySlotSize =
            arrayItemSize > 16
                ? 32 * Math.ceil(arrayItemSize / 32)
                : arrayItemSize

        // If base type is not an Elementary type
        // This can only be Array and UserDefined for base types of arrays.
        let referenceStorageSection
        if (baseAttributeType !== AttributeType.Elementary) {
            // recursively add storage section for Array and UserDefined types
            referenceStorageSection = parseReferenceStorageSection(
                baseAttribute,
                umlClass,
                otherClasses,
                storageSections
            )
        }
        const dynamicBase = referenceStorageSection?.arrayDynamic === true

        const getValue = calcGetValue(
            baseAttribute.attributeType,
            dynamicBase,
            referenceStorageSection?.type
        )

        const variables: Variable[] = []
        variables[0] = {
            id: variableId++,
            fromSlot: 0,
            toSlot: Math.floor((arraySlotSize - 1) / 32),
            byteSize: arrayItemSize,
            byteOffset: 0,
            type: baseType,
            attributeType: baseAttributeType,
            dynamic: dynamicBase,
            getValue,
            referenceSectionId: referenceStorageSection?.id,
        }

        // If a fixed size array.
        // Note dynamic arrays will have undefined arrayLength
        if (arrayLength > 1) {
            // Add a variable to the new storage section for each item in the fixed size array
            for (let i = 1; i < arrayLength; i++) {
                variables.push({
                    id: variableId++,
                    fromSlot: Math.floor((i * arraySlotSize) / 32),
                    toSlot: Math.floor(((i + 1) * arraySlotSize - 1) / 32),
                    byteSize: arrayItemSize,
                    byteOffset: (i * arraySlotSize) % 32,
                    type: baseType,
                    attributeType: baseAttributeType,
                    dynamic: dynamicBase,
                    getValue,
                    // only the first variable links to a referenced storage section
                    referenceSectionId: undefined,
                })
            }
        }

        const newStorageSection: StorageSection = {
            id: storageId++,
            name: `${attribute.type}: ${attribute.name}`,
            type: StorageSectionType.Array,
            arrayDynamic: dynamic,
            arrayLength,
            variables,
        }
        storageSections.push(newStorageSection)

        return newStorageSection
    }
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const dependentClass = otherClasses.find(({ name }) => {
            return (
                name === attribute.type || name === attribute.type.split('.')[1]
            )
        })
        if (!dependentClass) {
            throw Error(`Failed to find user defined type "${attribute.type}"`)
        }

        if (dependentClass.stereotype === ClassStereotype.Struct) {
            const variables = parseVariables(
                dependentClass,
                otherClasses,
                [],
                storageSections,
                []
            )
            const newStorageSection = {
                id: storageId++,
                name: attribute.type,
                type: StorageSectionType.Struct,
                variables,
            }
            storageSections.push(newStorageSection)

            return newStorageSection
        }
        return undefined
    }
    if (attribute.attributeType === AttributeType.Mapping) {
        // get the UserDefined type from the mapping
        // note the mapping could be an array of Structs
        // Could also be a mapping of a mapping
        const result = attribute.type.match(/=\\>((?!mapping)\w*)[\\[]/)
        // If mapping of user defined type
        if (result !== null && result[1] && !isElementary(result[1])) {
            // Find UserDefined type
            const typeClass = otherClasses.find(
                ({ name }) =>
                    name === result[1] || name === result[1].split('.')[1]
            )
            if (!typeClass) {
                throw Error(
                    `Failed to find user defined type "${result[1]}" in attribute type "${attribute.type}"`
                )
            }
            if (typeClass.stereotype === ClassStereotype.Struct) {
                const variables = parseVariables(
                    typeClass,
                    otherClasses,
                    [],
                    storageSections,
                    []
                )
                const newStorageSection = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageSectionType.Struct,
                    variables,
                }
                storageSections.push(newStorageSection)

                return newStorageSection
            }
        }
        return undefined
    }
    return undefined
}

// Calculates the storage size of an attribute in bytes
export const calcStorageByteSize = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: UmlClass[]
): { size: number; dynamic: boolean } => {
    if (
        attribute.attributeType === AttributeType.Mapping ||
        attribute.attributeType === AttributeType.Function
    ) {
        return { size: 32, dynamic: true }
    }
    if (attribute.attributeType === AttributeType.Array) {
        // Fixed sized arrays are read from right to left until there is a dynamic dimension
        // eg address[][3][2] is a fixed size array that uses 6 slots.
        // while address [2][] is a dynamic sized array.
        const arrayDimensions = attribute.type.match(/\[\w*]/g)
        // Remove first [ and last ] from each arrayDimensions
        const dimensionsStr = arrayDimensions.map((a) => a.slice(1, -1))
        // fixed-sized arrays are read from right to left so reverse the dimensions
        const dimensionsStrReversed = dimensionsStr.reverse()

        // read fixed-size dimensions until we get a dynamic array with no dimension
        let dimension = dimensionsStrReversed.shift()
        const fixedDimensions: number[] = []
        while (dimension && dimension !== '') {
            const dimensionNum = findDimensionLength(
                umlClass,
                dimension,
                otherClasses
            )
            fixedDimensions.push(dimensionNum)
            // read the next dimension for the next loop
            dimension = dimensionsStrReversed.shift()
        }

        // If the first dimension is dynamic, ie []
        if (fixedDimensions.length === 0) {
            // dynamic arrays start at the keccak256 of the slot number
            // the array length is stored in the 32 byte slot
            return { size: 32, dynamic: true }
        }

        let elementSize: number
        const type = attribute.type.substring(0, attribute.type.indexOf('['))
        // If a fixed sized array
        if (isElementary(type)) {
            const elementAttribute: Attribute = {
                attributeType: AttributeType.Elementary,
                type,
                name: 'element',
            }
            ;({ size: elementSize } = calcStorageByteSize(
                elementAttribute,
                umlClass,
                otherClasses
            ))
        } else {
            const elementAttribute: Attribute = {
                attributeType: AttributeType.UserDefined,
                type,
                name: 'userDefined',
            }
            ;({ size: elementSize } = calcStorageByteSize(
                elementAttribute,
                umlClass,
                otherClasses
            ))
        }
        // Anything over 16 bytes, like an address, will take a whole 32 byte slot
        if (elementSize > 16 && elementSize < 32) {
            elementSize = 32
        }
        // If multi dimension, then the first element is 32 bytes
        if (fixedDimensions.length < arrayDimensions.length) {
            const totalDimensions = fixedDimensions.reduce(
                (total, dimension) => total * dimension,
                1
            )
            return {
                size: 32 * totalDimensions,
                dynamic: false,
            }
        }
        const lastItem = fixedDimensions.length - 1
        const lastDimensionBytes = elementSize * fixedDimensions[lastItem]
        const lastDimensionSlotBytes = Math.ceil(lastDimensionBytes / 32) * 32
        const remainingDimensions = fixedDimensions
            .slice(0, lastItem)
            .reduce((total, dimension) => total * dimension, 1)
        return {
            size: lastDimensionSlotBytes * remainingDimensions,
            dynamic: false,
        }
    }
    // If a Struct or Enum
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeClass = otherClasses.find(({ name }) => {
            return (
                name === attribute.type || name === attribute.type.split('.')[1]
            )
        })
        if (!attributeClass) {
            throw Error(
                `Failed to find user defined struct or enum "${attribute.type}"`
            )
        }

        switch (attributeClass.stereotype) {
            case ClassStereotype.Enum:
                return { size: 1, dynamic: false }
            case ClassStereotype.Contract:
            case ClassStereotype.Abstract:
            case ClassStereotype.Interface:
            case ClassStereotype.Library:
                return { size: 20, dynamic: false }
            case ClassStereotype.Struct:
                let structByteSize = 0
                attributeClass.attributes.forEach((structAttribute) => {
                    // If next attribute is an array, then we need to start in a new slot
                    if (structAttribute.attributeType === AttributeType.Array) {
                        structByteSize = Math.ceil(structByteSize / 32) * 32
                    }
                    // If next attribute is an struct, then we need to start in a new slot
                    else if (
                        structAttribute.attributeType ===
                        AttributeType.UserDefined
                    ) {
                        // UserDefined types can be a struct or enum, so we need to check if it's a struct
                        const userDefinedClass = otherClasses.find(
                            ({ name }) => {
                                return (
                                    name === structAttribute.type ||
                                    name === structAttribute.type.split('.')[1]
                                )
                            }
                        )
                        if (!userDefinedClass) {
                            throw Error(
                                `Failed to find user defined type "${structAttribute.type}" in struct ${attributeClass.name}`
                            )
                        }
                        // If a struct
                        if (
                            userDefinedClass.stereotype ===
                            ClassStereotype.Struct
                        ) {
                            structByteSize = Math.ceil(structByteSize / 32) * 32
                        }
                    }
                    const { size: attributeSize } = calcStorageByteSize(
                        structAttribute,
                        umlClass,
                        otherClasses
                    )
                    // check if attribute will fit into the remaining slot
                    const endCurrentSlot = Math.ceil(structByteSize / 32) * 32
                    const spaceLeftInSlot = endCurrentSlot - structByteSize
                    if (attributeSize <= spaceLeftInSlot) {
                        structByteSize += attributeSize
                    } else {
                        structByteSize = endCurrentSlot + attributeSize
                    }
                })
                // structs take whole 32 byte slots so round up to the nearest 32 sized slots
                return {
                    size: Math.ceil(structByteSize / 32) * 32,
                    dynamic: false,
                }
            default:
                return { size: 32, dynamic: false }
        }
    }

    if (attribute.attributeType === AttributeType.Elementary) {
        switch (attribute.type) {
            case 'bool':
                return { size: 1, dynamic: false }
            case 'address':
                return { size: 20, dynamic: false }
            case 'string':
            case 'bytes':
            case 'uint':
            case 'int':
            case 'ufixed':
            case 'fixed':
                return { size: 32, dynamic: false }
            default:
                const result = attribute.type.match(
                    /[u]*(int|fixed|bytes)([0-9]+)/
                )
                if (result === null || !result[2]) {
                    throw Error(
                        `Failed size elementary type "${attribute.type}"`
                    )
                }
                // If bytes
                if (result[1] === 'bytes') {
                    return { size: parseInt(result[2]), dynamic: false }
                }
                // TODO need to handle fixed types when they are supported

                // If an int
                const bitSize = parseInt(result[2])
                return { size: bitSize / 8, dynamic: false }
        }
    }
    throw new Error(
        `Failed to calc bytes size of attribute with name "${attribute.name}" and type ${attribute.type}`
    )
}

export const isElementary = (type: string): boolean => {
    switch (type) {
        case 'bool':
        case 'address':
        case 'string':
        case 'bytes':
        case 'uint':
        case 'int':
        case 'ufixed':
        case 'fixed':
            return true
        default:
            const result = type.match(/[u]*(int|fixed|bytes)([0-9]+)/)
            return result !== null
    }
}

export const calcSectionOffset = (variable: Variable): string | undefined => {
    if (variable.dynamic) {
        const hexStringOf32Bytes = hexZeroPad(
            BigNumber.from(variable.fromSlot).toHexString(),
            32
        )
        return keccak256(hexStringOf32Bytes)
    }
    return BigNumber.from(variable.fromSlot).toHexString()
}

export const findDimensionLength = (
    umlClass: UmlClass,
    dimension: string,
    otherClasses: UmlClass[]
): number => {
    const dimensionNum = parseInt(dimension)
    if (Number.isInteger(dimensionNum)) {
        return dimensionNum
    }

    // Try and size array dimension from declared constants
    const constant = umlClass.constants.find(
        (constant) => constant.name === dimension
    )
    if (constant) {
        return constant.value
    }

    // Try and size array dimension from file constants
    const fileConstant = otherClasses.find(
        (umlClass) =>
            umlClass.name === dimension &&
            umlClass.stereotype === ClassStereotype.Constant
    )
    if (fileConstant?.constants[0]?.value) {
        return fileConstant.constants[0].value
    }
    throw Error(
        `Could not size fixed sized array with dimension "${dimension}"`
    )
}

/**
 * Calculate if the storage slot value should be retrieved for the attribute.
 *
 * Elementary types should return true.
 * Dynamic Array types should return true.
 * Static Array types should return false.
 * UserDefined types that are Structs should return false.
 * UserDefined types that are Enums or alias to Elementary type should return true.
 *
 * @param attributeType
 * @param dynamic flags if the variable is of dynamic size
 * @param storageSectionType
 * @return getValue true if the slot value should be retrieved.
 */
const calcGetValue = (
    attributeType: AttributeType,
    dynamic: boolean,
    storageSectionType?: StorageSectionType
): boolean =>
    attributeType === AttributeType.Elementary ||
    (attributeType === AttributeType.UserDefined &&
        storageSectionType !== StorageSectionType.Struct) ||
    (attributeType === AttributeType.Array && dynamic)

// recursively adds dynamic array variables
export const addDynamicArrayVariables = (
    storageSection: StorageSection,
    storageSections: StorageSection[]
) => {
    storageSection.variables.forEach((variable) => {
        if (variable.attributeType !== AttributeType.Array) return

        // find storage section that the variable is referencing
        const referenceStorageSection = storageSections.find(
            (ss) => ss.id === variable.referenceSectionId
        )

        if (!referenceStorageSection) return

        // recursively add dynamic array variables
        addDynamicArrayVariables(referenceStorageSection, storageSections)

        if (!variable.dynamic) return

        const arrayItemSize = referenceStorageSection.variables[0].byteSize
        // If more than 16 bytes, then round up in 32 bytes increments
        const arraySlotSize =
            arrayItemSize > 16
                ? 32 * Math.ceil(arrayItemSize / 32)
                : arrayItemSize

        const arrayLength = BigNumber.from(variable.value).toNumber()
        for (let i = 1; i < arrayLength; i++) {
            const fromSlot = Math.floor((i * arraySlotSize) / 32)
            const toSlot = Math.floor(((i + 1) * arraySlotSize - 1) / 32)
            const byteOffset = (i * arraySlotSize) % 32
            const value =
                fromSlot === 0
                    ? referenceStorageSection.variables[0].value
                    : undefined

            // add extra variables
            referenceStorageSection.variables.push({
                ...referenceStorageSection.variables[0],
                id: variableId++,
                fromSlot,
                toSlot,
                byteOffset,
                value,
                referenceSectionId: undefined,
            })

            // TODO get missing slot values
        }
    })
}
