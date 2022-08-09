import { Attribute, AttributeType, ClassStereotype, UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'
import { getStorageValues } from './slotValues'
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import path from 'path'

const debug = require('debug')('sol2uml')

export enum StorageType {
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
    dynamic: boolean
    variable?: string
    contractName?: string
    noValue: boolean
    value?: string
    referenceStorageId?: number
    enumId?: number
}

export interface Storage {
    id: number
    name: string
    address?: string
    slotKey?: string
    type: StorageType
    arrayLength?: number
    arrayDynamic?: boolean
    variables: Variable[]
}

let storageId = 1
let variableId = 1

/**
 *
 * @param url
 * @param contractAddress Contract address to get the storage slot values from
 * @param storage is mutated with the storage values
 */
export const addStorageValues = async (
    url: string,
    contractAddress: string,
    storage: Storage,
    blockTag: string
) => {
    const valueVariables = storage.variables.filter((s) => !s.noValue)
    const slots = valueVariables.map((s) => s.fromSlot)

    const values = await getStorageValues(url, contractAddress, slots, blockTag)
    valueVariables.forEach((storage, i) => {
        storage.value = values[i]
    })
}

export const convertClasses2Storages = (
    contractName: string,
    umlClasses: UmlClass[],
    contractFilename?: string
): Storage[] => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name, relativePath }) => {
        if (!contractFilename) {
            return name === contractName
        }
        return (
            name === contractName &&
            (relativePath == contractFilename ||
                path.basename(relativePath) ===
                    path.normalize(contractFilename))
        )
    })
    if (!umlClass) {
        const contractFilenameError = contractFilename
            ? ` in filename "${contractFilename}"`
            : ''
        throw Error(
            `Failed to find contract with name "${contractName}"${contractFilenameError}`
        )
    }
    debug(`Found contract "${contractName}" in ${umlClass.absolutePath}`)

    const storages: Storage[] = []
    const variables = parseVariables(umlClass, umlClasses, [], storages, [])

    storages.unshift({
        id: storageId++,
        name: contractName,
        type: StorageType.Contract,
        variables: variables,
    })

    return storages
}

/**
 * Recursively parses the storage variables for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storages mutable array of storages that is appended with structs
 */
const parseVariables = (
    umlClass: UmlClass,
    umlClasses: UmlClass[],
    variables: Variable[],
    storages: Storage[],
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
            storages,
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
        const noValue =
            attribute.attributeType === AttributeType.Mapping ||
            (attribute.attributeType === AttributeType.Array && !dynamic)

        // find any dependent storage locations
        const referenceStorage = parseReferenceStorage(
            attribute,
            umlClass,
            umlClasses,
            storages
        )

        // Get the toSlot of the last storage item
        let lastToSlot = 0
        let nextOffset = 0
        if (variables.length > 0) {
            const lastStorage = variables[variables.length - 1]
            lastToSlot = lastStorage.toSlot
            nextOffset = lastStorage.byteOffset + lastStorage.byteSize
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
                dynamic,
                noValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceStorageId: referenceStorage?.id,
            }
        } else {
            newVariable = {
                id: variableId++,
                fromSlot: lastToSlot,
                toSlot: lastToSlot,
                byteSize,
                byteOffset: nextOffset,
                type: attribute.type,
                dynamic,
                noValue,
                variable: attribute.name,
                contractName: umlClass.name,
                referenceStorageId: referenceStorage?.id,
            }
        }
        if (referenceStorage) {
            if (!newVariable.dynamic) {
                offsetStorageSlots(
                    referenceStorage,
                    newVariable.fromSlot,
                    storages
                )
            } else if (attribute.attributeType === AttributeType.Array) {
                referenceStorage.slotKey = calcSlotKey(newVariable)
            }
        }
        variables.push(newVariable)
    })

    return variables
}

export const parseReferenceStorage = (
    attribute: Attribute,
    umlClass: UmlClass,
    otherClasses: UmlClass[],
    storages: Storage[]
): Storage | undefined => {
    if (attribute.attributeType === AttributeType.Array) {
        // storage is dynamic if the attribute type ends in []
        const result = attribute.type.match(/\[(\w*)]$/)
        const dynamic = result[1] === ''
        const arrayLength = !dynamic
            ? findDimensionLength(umlClass, result[1])
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

        const firstVariable: Variable = {
            id: variableId++,
            fromSlot: 0,
            toSlot: Math.floor((arrayItemSize - 1) / 32),
            byteSize: arrayItemSize,
            byteOffset: 0,
            type: baseType,
            dynamic,
            noValue: false,
        }
        const variables = [firstVariable]
        if (arrayLength > 1) {
            for (let i = 1; i < arrayLength; i++) {
                variables.push({
                    id: variableId++,
                    fromSlot: Math.floor((i * arrayItemSize) / 32),
                    toSlot: Math.floor(((i + 1) * arrayItemSize - 1) / 32),
                    byteSize: arrayItemSize,
                    byteOffset: (i * arrayItemSize) % 32,
                    type: baseType,
                    dynamic,
                    noValue: false,
                })
            }
        }

        // recursively add storage
        if (baseAttributeType !== AttributeType.Elementary) {
            const referenceStorage = parseReferenceStorage(
                baseAttribute,
                umlClass,
                otherClasses,
                storages
            )
            firstVariable.referenceStorageId = referenceStorage?.id
        }

        const newStorage: Storage = {
            id: storageId++,
            name: `${attribute.type}: ${attribute.name}`,
            type: StorageType.Array,
            arrayDynamic: dynamic,
            arrayLength,
            variables,
        }
        storages.push(newStorage)

        return newStorage
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
                storages,
                []
            )
            const newStorage = {
                id: storageId++,
                name: attribute.type,
                type: StorageType.Struct,
                variables,
            }
            storages.push(newStorage)

            return newStorage
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
                    storages,
                    []
                )
                const newStorage = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageType.Struct,
                    variables,
                }
                storages.push(newStorage)

                return newStorage
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
            const dimensionNum = findDimensionLength(umlClass, dimension)
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

export const calcSlotKey = (variable: Variable): string | undefined => {
    if (variable.dynamic) {
        return keccak256(
            toUtf8Bytes(BigNumber.from(variable.fromSlot).toHexString())
        )
    }
    return BigNumber.from(variable.fromSlot).toHexString()
}

// recursively offset the slots numbers of a storage item
export const offsetStorageSlots = (
    storage: Storage,
    slots: number,
    storages: Storage[]
) => {
    storage.variables.forEach((variable) => {
        variable.fromSlot += slots
        variable.toSlot += slots
        if (variable.referenceStorageId) {
            // recursively offset the referenced storage
            const referenceStorage = storages.find(
                (s) => s.id === variable.referenceStorageId
            )
            if (!referenceStorage.arrayDynamic) {
                offsetStorageSlots(referenceStorage, slots, storages)
            } else {
                referenceStorage.slotKey = calcSlotKey(variable)
            }
        }
    })
}

export const findDimensionLength = (
    umlClass: UmlClass,
    dimension: string
): number => {
    const dimensionNum = parseInt(dimension)
    if (Number.isInteger(dimensionNum)) {
        return dimensionNum
    } else {
        // Try and size array dimension from declared constants
        const constant = umlClass.constants.find(
            (constant) => constant.name === dimension
        )
        if (!constant) {
            throw Error(
                `Could not size fixed sized array with dimension "${dimension}"`
            )
        }
        return constant.value
    }
}
