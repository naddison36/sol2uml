import { Attribute, AttributeType, ClassStereotype, UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'
import { hexZeroPad, keccak256 } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import path from 'path'
import { BigNumberish } from '@ethersproject/bignumber'
import { addSlotValues, dynamicSlotSize } from './slotValues'

const debug = require('debug')('sol2uml')

export enum StorageSectionType {
    Contract = 'Contract',
    Struct = 'Struct',
    Array = 'Array',
    Bytes = 'Bytes',
    String = 'String',
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
    name?: string
    contractName?: string
    displayValue: boolean
    getValue?: boolean
    slotValue?: string
    parsedValue?: string
    referenceSectionId?: number
}

export interface StorageSection {
    id: number
    name: string
    address?: string
    offset?: string
    type: StorageSectionType
    arrayLength?: number
    arrayDynamic?: boolean
    mapping: boolean // is referenced from a mapping
    variables: Variable[]
}

let storageId = 1
let variableId = 1

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
        [],
        false
    )

    // Add new storage section to the beginning of the array
    storageSections.unshift({
        id: storageId++,
        name: contractName,
        type: StorageSectionType.Contract,
        variables: variables,
        mapping: false,
    })

    adjustSlots(storageSections[0], 0, storageSections)

    return storageSections
}

/**
 * Recursively parse the storage variables for a given contract or struct.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storageSections mutable array of storageSection objects
 * @param inheritedContracts mutable array of contracts that have been inherited already
 * @param mapping flags that the storage section is under a mapping
 * @return variables array of storage variables in the `umlClass`
 */
const parseVariables = (
    umlClass: UmlClass,
    umlClasses: readonly UmlClass[],
    variables: Variable[],
    storageSections: StorageSection[],
    inheritedContracts: string[],
    mapping: boolean
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
            inheritedContracts,
            mapping
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

        // parse any dependent storage sections
        const referenceStorageSection = parseStorageSectionFromAttribute(
            attribute,
            umlClass,
            umlClasses,
            storageSections,
            mapping || attribute.attributeType === AttributeType.Mapping
        )

        // should this new variable get the slot value
        const displayValue = calcDisplayValue(
            attribute.attributeType,
            dynamic,
            mapping,
            referenceStorageSection?.type
        )
        const getValue = calcGetValue(attribute.attributeType, mapping)

        // Get the toSlot of the last storage item
        const lastVariable = variables[variables.length - 1]
        let lastToSlot = lastVariable ? lastVariable.toSlot : 0
        let nextOffset = lastVariable
            ? lastVariable.byteOffset + lastVariable.byteSize
            : 0
        let fromSlot
        let toSlot
        let byteOffset
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0
            fromSlot = nextFromSlot
            toSlot = nextFromSlot + Math.floor((byteSize - 1) / 32)
            byteOffset = 0
        } else {
            fromSlot = lastToSlot
            toSlot = lastToSlot
            byteOffset = nextOffset
        }
        variables.push({
            id: variableId++,
            fromSlot,
            toSlot,
            byteSize,
            byteOffset,
            type: attribute.type,
            attributeType: attribute.attributeType,
            dynamic,
            getValue,
            displayValue,
            name: attribute.name,
            contractName: umlClass.name,
            referenceSectionId: referenceStorageSection?.id,
        })
    })

    return variables
}

/**
 * Recursively adjusts the fromSlot and toSlot properties of any storage variables
 * that are referenced by a static array or struct.
 * Also sets the storage slot offset for dynamic arrays, strings and bytes.
 * @param storageSection
 * @param slotOffset
 * @param storageSections
 */
const adjustSlots = (
    storageSection: StorageSection,
    slotOffset: number,
    storageSections: StorageSection[]
) => {
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
                adjustSlots(
                    referenceStorageSection,
                    variable.fromSlot,
                    storageSections
                )
            } else if (variable.attributeType === AttributeType.Array) {
                // attribute is a dynamic array
                referenceStorageSection.offset = calcSectionOffset(variable)

                adjustSlots(referenceStorageSection, 0, storageSections)
            }
        }
    })
}

/**
 * Recursively adds new storage sections under a class attribute.
 * @param attribute the attribute that is referencing a storage section
 * @param umlClass contract or file level struct
 * @param otherClasses array of all the UML Classes
 * @param storageSections mutable array of storageSection objects
 * @param mapping flags that the storage section is under a mapping
 * @return storageSection new storage section that was added or undefined if none was added.
 */
export const parseStorageSectionFromAttribute = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: readonly UmlClass[],
    storageSections: StorageSection[],
    mapping: boolean
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
            name: attribute.name,
            type: baseType,
            attributeType: baseAttributeType,
        }
        const { size: arrayItemSize, dynamic: dynamicBase } =
            calcStorageByteSize(baseAttribute, umlClass, otherClasses)
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
            referenceStorageSection = parseStorageSectionFromAttribute(
                baseAttribute,
                umlClass,
                otherClasses,
                storageSections,
                mapping
            )
        }

        const displayValue = calcDisplayValue(
            baseAttribute.attributeType,
            dynamicBase,
            mapping,
            referenceStorageSection?.type
        )
        const getValue = calcGetValue(attribute.attributeType, mapping)

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
            displayValue,
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
                    displayValue,
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
            mapping,
        }
        storageSections.push(newStorageSection)

        return newStorageSection
    }
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const typeClass = findTypeClass(attribute.type, attribute, otherClasses)

        if (typeClass.stereotype === ClassStereotype.Struct) {
            let variables = parseVariables(
                typeClass,
                otherClasses,
                [],
                storageSections,
                [],
                mapping
            )
            const newStorageSection = {
                id: storageId++,
                name: attribute.type,
                type: StorageSectionType.Struct,
                variables,
                mapping,
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
            // Find UserDefined type can be a contract, struct or enum
            const typeClass = findTypeClass(result[1], attribute, otherClasses)

            if (typeClass.stereotype === ClassStereotype.Struct) {
                let variables = parseVariables(
                    typeClass,
                    otherClasses,
                    [],
                    storageSections,
                    [],
                    true
                )
                const newStorageSection = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageSectionType.Struct,
                    mapping: true,
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

/**
 * Finds an attribute's user defined type that can be a Contract, Struct or Enum
 * @param userType User defined type that is being looked for. This can be the base type of an attribute.
 * @param attribute the attribute in the class that is user defined. This is just used for logging purposes
 * @param otherClasses
 */
const findTypeClass = (
    userType: string,
    attribute: Attribute,
    otherClasses: readonly UmlClass[]
): UmlClass => {
    // Find associated UserDefined type
    // TODO this just matches on name and doesn't take into account imports
    const typeClass = otherClasses.find(
        ({ name }) => name === userType || name === userType.split('.')[1]
    )
    if (!typeClass) {
        throw Error(
            `Failed to find user defined type "${userType}" in attribute "${attribute.name}" of type "${attribute.attributeType}""`
        )
    }
    return typeClass
}

// Calculates the storage size of an attribute in bytes
export const calcStorageByteSize = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: readonly UmlClass[]
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
    // If a Struct, Enum or Contract reference
    // TODO need to handle User Defined Value Types when they are added to Solidity
    if (attribute.attributeType === AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeTypeClass = findTypeClass(
            attribute.type,
            attribute,
            otherClasses
        )

        switch (attributeTypeClass.stereotype) {
            case ClassStereotype.Enum:
                return { size: 1, dynamic: false }
            case ClassStereotype.Contract:
            case ClassStereotype.Abstract:
            case ClassStereotype.Interface:
            case ClassStereotype.Library:
                return { size: 20, dynamic: false }
            case ClassStereotype.Struct:
                let structByteSize = 0
                attributeTypeClass.attributes.forEach((structAttribute) => {
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
                        const userDefinedClass = findTypeClass(
                            structAttribute.type,
                            structAttribute,
                            otherClasses
                        )
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
                return { size: 32, dynamic: true }
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
            const result = type.match(/^[u]?(int|fixed|bytes)([0-9]+)$/)
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
    otherClasses: readonly UmlClass[]
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
 * Calculate if the storage slot value for the attribute should be displayed in the storage section.
 *
 * Storage sections with true mapping should return false.
 * Mapping types should return false.
 * Elementary types should return true.
 * Dynamic Array types should return true.
 * Static Array types should return false.
 * UserDefined types that are Structs should return false.
 * UserDefined types that are Enums or alias to Elementary type or contract should return true.
 *
 * @param attributeType
 * @param dynamic flags if the variable is of dynamic size
 * @param mapping flags if the storage section is referenced by a mapping
 * @param storageSectionType
 * @return displayValue true if the slot value should be displayed.
 */
const calcDisplayValue = (
    attributeType: AttributeType,
    dynamic: boolean,
    mapping: boolean,
    storageSectionType?: StorageSectionType
): boolean =>
    mapping === false &&
    (attributeType === AttributeType.Elementary ||
        (attributeType === AttributeType.UserDefined &&
            storageSectionType !== StorageSectionType.Struct) ||
        (attributeType === AttributeType.Array && dynamic))

/**
 * Calculate if the storage slot value for the attribute should be retrieved from the chain.
 *
 * Storage sections with true mapping should return false.
 * Mapping types should return false.
 * Elementary types should return true.
 * Array types should return true.
 * UserDefined should return true.
 *
 * @param attributeType
 * @param dynamic flags if the variable is of dynamic size
 * @param mapping flags if the storage section is referenced by a mapping
 * @param storageSectionType
 * @return displayValue true if the slot value should be displayed.
 */
const calcGetValue = (
    attributeType: AttributeType,
    mapping: boolean
): boolean => mapping === false && attributeType !== AttributeType.Mapping

// recursively adds variables for dynamic string, bytes or arrays
export const addDynamicVariables = async (
    storageSection: StorageSection,
    storageSections: StorageSection[],
    url: string,
    storageAddress: string,
    blockTag?: BigNumberish | 'latest'
) => {
    for (const variable of storageSection.variables) {
        // STEP 1 - add slots for dynamic string and bytes
        if (variable.type === 'string' || variable.type === 'bytes') {
            const size = dynamicSlotSize(variable.slotValue)
            if (size > 31) {
                const maxSlotNumber = Math.floor((size - 1) / 32)
                const variables: Variable[] = []

                // For each dynamic slot
                for (let i = 0; i <= maxSlotNumber; i++) {
                    // If the last slot then get the remaining bytes
                    const byteSize =
                        i === maxSlotNumber ? size - 32 * maxSlotNumber : 32
                    // Add variable for the slot
                    variables.push({
                        id: variableId++,
                        fromSlot: i,
                        toSlot: i,
                        byteSize,
                        byteOffset: 0,
                        type: variable.type,
                        contractName: variable.contractName,
                        attributeType: AttributeType.Elementary,
                        dynamic: false,
                        getValue: true,
                        displayValue: true,
                    })
                }

                // add unallocated variable
                const unusedBytes = 32 - (size - 32 * maxSlotNumber)
                if (unusedBytes > 0) {
                    const lastVariable = variables[variables.length - 1]
                    variables.push({
                        ...lastVariable,
                        byteOffset: unusedBytes,
                    })

                    variables[maxSlotNumber] = {
                        id: variableId++,
                        fromSlot: maxSlotNumber,
                        toSlot: maxSlotNumber,
                        byteSize: unusedBytes,
                        byteOffset: 0,
                        type: 'unallocated',
                        attributeType: AttributeType.UserDefined,
                        contractName: variable.contractName,
                        name: '',
                        dynamic: false,
                        getValue: false,
                        displayValue: false,
                    }
                }

                const newStorageSection: StorageSection = {
                    id: storageId++,
                    name: `${variable.type}: ${variable.name}`,
                    offset: calcSectionOffset(variable),
                    type:
                        variable.type === 'string'
                            ? StorageSectionType.String
                            : StorageSectionType.Bytes,
                    arrayDynamic: true,
                    arrayLength: size,
                    variables,
                    mapping: false,
                }
                variable.referenceSectionId = newStorageSection.id

                // get slot values for dynamic the string or byte storage
                await addSlotValues(
                    url,
                    storageAddress,
                    newStorageSection,
                    blockTag
                )

                storageSections.push(newStorageSection)
            }

            continue
        }
        if (variable.attributeType !== AttributeType.Array) continue

        // STEP 2 - add slots for dynamic arrays

        // find storage section that the variable is referencing
        const referenceStorageSection = storageSections.find(
            (ss) => ss.id === variable.referenceSectionId
        )
        if (!referenceStorageSection) continue

        // recursively add dynamic array variables
        await addDynamicVariables(
            referenceStorageSection,
            storageSections,
            url,
            storageAddress,
            blockTag
        )

        if (!variable.dynamic) continue

        const arrayItemSize = referenceStorageSection.variables[0].byteSize
        // If more than 16 bytes, then round up in 32 bytes increments
        const arraySlotSize =
            arrayItemSize > 16
                ? 32 * Math.ceil(arrayItemSize / 32)
                : arrayItemSize

        const arrayLength = BigNumber.from(variable.slotValue).toNumber()
        for (let i = 1; i < arrayLength; i++) {
            const fromSlot = Math.floor((i * arraySlotSize) / 32)
            const toSlot = Math.floor(((i + 1) * arraySlotSize - 1) / 32)
            const byteOffset = (i * arraySlotSize) % 32
            const value =
                fromSlot === 0
                    ? referenceStorageSection.variables[0].slotValue
                    : undefined

            // add extra variables
            referenceStorageSection.variables.push({
                ...referenceStorageSection.variables[0],
                id: variableId++,
                fromSlot,
                toSlot,
                byteOffset,
                slotValue: value,
                referenceSectionId: undefined,
                dynamic: false,
            })

            // Get missing slot values
            await addSlotValues(
                url,
                storageAddress,
                referenceStorageSection,
                blockTag
            )
        }
    }
}
