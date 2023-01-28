"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findDimensionLength = exports.offsetStorageSlots = exports.calcSlotKey = exports.isElementary = exports.calcStorageByteSize = exports.parseReferenceStorageSection = exports.convertClasses2StorageSections = exports.addStorageValues = exports.StorageType = void 0;
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const slotValues_1 = require("./slotValues");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const debug = require('debug')('sol2uml');
var StorageType;
(function (StorageType) {
    StorageType["Contract"] = "Contract";
    StorageType["Struct"] = "Struct";
    StorageType["Array"] = "Array";
})(StorageType = exports.StorageType || (exports.StorageType = {}));
let storageId = 1;
let variableId = 1;
/**
 *
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param storageSection is mutated with the storage values
 * @param blockTag block number or `latest`
 */
const addStorageValues = async (url, contractAddress, storageSection, blockTag) => {
    const valueVariables = storageSection.variables.filter((s) => !s.noValue);
    const slots = storageSection.slotKey
        ? valueVariables.map((s) => ethers_1.BigNumber.from(storageSection.slotKey).add(s.fromSlot))
        : valueVariables.map((s) => s.fromSlot);
    const values = await (0, slotValues_1.getStorageValues)(url, contractAddress, slots, blockTag);
    valueVariables.forEach((valueVariable, i) => {
        valueVariable.value = values[i];
    });
};
exports.addStorageValues = addStorageValues;
/**
 *
 * @param contractName name of the contract to get storage layout.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
const convertClasses2StorageSections = (contractName, umlClasses, contractFilename) => {
    // Find the base UML Class from the base contract name
    const umlClass = umlClasses.find(({ name, relativePath }) => {
        if (!contractFilename) {
            return name === contractName;
        }
        return (name === contractName &&
            (relativePath == path_1.default.normalize(contractFilename) ||
                path_1.default.basename(relativePath) ===
                    path_1.default.normalize(contractFilename)));
    });
    if (!umlClass) {
        const contractFilenameError = contractFilename
            ? ` in filename "${contractFilename}"`
            : '';
        throw Error(`Failed to find contract with name "${contractName}"${contractFilenameError}.\nIs the \`-c --contract <name>\` option correct?`);
    }
    debug(`Found contract "${contractName}" in ${umlClass.absolutePath}`);
    const storageSections = [];
    const variables = parseVariables(umlClass, umlClasses, [], storageSections, []);
    // Add new storage section to the beginning of the array
    storageSections.unshift({
        id: storageId++,
        name: contractName,
        type: StorageType.Contract,
        variables: variables,
    });
    return storageSections;
};
exports.convertClasses2StorageSections = convertClasses2StorageSections;
/**
 * Recursively parses the storage variables for a given contract.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage slots that is appended to
 * @param storageSections mutable array of storageSection objects
 */
const parseVariables = (umlClass, umlClasses, variables, storageSections, inheritedContracts) => {
    // Add storage slots from inherited contracts first.
    // Get immediate parent contracts that the class inherits from
    const parentContracts = umlClass.getParentContracts();
    // Filter out any already inherited contracts
    const newInheritedContracts = parentContracts.filter((parentContract) => !inheritedContracts.includes(parentContract.targetUmlClassName));
    // Mutate inheritedContracts to include the new inherited contracts
    inheritedContracts.push(...newInheritedContracts.map((c) => c.targetUmlClassName));
    // Recursively parse each new inherited contract
    newInheritedContracts.forEach((parent) => {
        const parentClass = (0, associations_1.findAssociatedClass)(parent, umlClass, umlClasses);
        if (!parentClass) {
            throw Error(`Failed to find inherited contract "${parent.targetUmlClassName}" of "${umlClass.absolutePath}"`);
        }
        // recursively parse inherited contract
        parseVariables(parentClass, umlClasses, variables, storageSections, inheritedContracts);
    });
    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled)
            return;
        const { size: byteSize, dynamic } = (0, exports.calcStorageByteSize)(attribute, umlClass, umlClasses);
        const noValue = calcNoValue(attribute, dynamic);
        // find any dependent storage section locations
        const referenceStorageSection = (0, exports.parseReferenceStorageSection)(attribute, umlClass, umlClasses, storageSections);
        // Get the toSlot of the last storage item
        let lastToSlot = 0;
        let nextOffset = 0;
        if (variables.length > 0) {
            const lastVariable = variables[variables.length - 1];
            lastToSlot = lastVariable.toSlot;
            nextOffset = lastVariable.byteOffset + lastVariable.byteSize;
        }
        let newVariable;
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0;
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
                referenceSectionId: referenceStorageSection?.id,
            };
        }
        else {
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
                referenceSectionId: referenceStorageSection?.id,
            };
        }
        if (referenceStorageSection) {
            if (!newVariable.dynamic) {
                (0, exports.offsetStorageSlots)(referenceStorageSection, newVariable.fromSlot, storageSections);
            }
            else if (attribute.attributeType === umlClass_1.AttributeType.Array) {
                // attribute is a dynamic array
                referenceStorageSection.slotKey = (0, exports.calcSlotKey)(newVariable);
                // TODO find a more recursive solution as this won't work for multi dimensional arrays
                // Get the slotKey of the referenced type
                storageSections[referenceStorageSection.id - 2].slotKey =
                    referenceStorageSection.slotKey;
            }
        }
        variables.push(newVariable);
    });
    return variables;
};
const parseReferenceStorageSection = (attribute, umlClass, otherClasses, storageSections) => {
    if (attribute.attributeType === umlClass_1.AttributeType.Array) {
        // storage is dynamic if the attribute type ends in []
        const result = attribute.type.match(/\[(\w*)]$/);
        const dynamic = result[1] === '';
        const arrayLength = !dynamic
            ? (0, exports.findDimensionLength)(umlClass, result[1])
            : undefined;
        // get the type of the array items. eg
        // address[][4][2] will have base type address[][4]
        const baseType = attribute.type.substring(0, attribute.type.lastIndexOf('['));
        let baseAttributeType;
        if ((0, exports.isElementary)(baseType)) {
            baseAttributeType = umlClass_1.AttributeType.Elementary;
        }
        else if (baseType[baseType.length - 1] === ']') {
            baseAttributeType = umlClass_1.AttributeType.Array;
        }
        else {
            baseAttributeType = umlClass_1.AttributeType.UserDefined;
        }
        const baseAttribute = {
            visibility: attribute.visibility,
            name: baseType,
            type: baseType,
            attributeType: baseAttributeType,
        };
        const { size: arrayItemSize } = (0, exports.calcStorageByteSize)(baseAttribute, umlClass, otherClasses);
        const arraySlotSize = arrayItemSize > 16
            ? 32 * Math.ceil(arrayItemSize / 32)
            : arrayItemSize;
        const noValue = calcNoValue(baseAttribute, dynamic);
        const variables = [];
        variables[0] = {
            id: variableId++,
            fromSlot: 0,
            toSlot: Math.floor((arraySlotSize - 1) / 32),
            byteSize: arrayItemSize,
            byteOffset: 0,
            type: baseType,
            dynamic,
            noValue,
        };
        if (arrayLength > 1) {
            // For fixed length arrays. Dynamic arrays will have undefined arrayLength
            for (let i = 1; i < arrayLength; i++) {
                variables.push({
                    id: variableId++,
                    fromSlot: Math.floor((i * arraySlotSize) / 32),
                    toSlot: Math.floor(((i + 1) * arraySlotSize - 1) / 32),
                    byteSize: arrayItemSize,
                    byteOffset: (i * arraySlotSize) % 32,
                    type: baseType,
                    dynamic,
                    noValue: false,
                });
            }
        }
        // recursively add storage
        if (baseAttributeType !== umlClass_1.AttributeType.Elementary) {
            const referenceStorageSection = (0, exports.parseReferenceStorageSection)(baseAttribute, umlClass, otherClasses, storageSections);
            variables[0].referenceSectionId = referenceStorageSection?.id;
        }
        const newStorageSection = {
            id: storageId++,
            name: `${attribute.type}: ${attribute.name}`,
            type: StorageType.Array,
            arrayDynamic: dynamic,
            arrayLength,
            variables,
        };
        storageSections.push(newStorageSection);
        return newStorageSection;
    }
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const dependentClass = otherClasses.find(({ name }) => {
            return (name === attribute.type || name === attribute.type.split('.')[1]);
        });
        if (!dependentClass) {
            throw Error(`Failed to find user defined type "${attribute.type}"`);
        }
        if (dependentClass.stereotype === umlClass_1.ClassStereotype.Struct) {
            const variables = parseVariables(dependentClass, otherClasses, [], storageSections, []);
            const newStorageSection = {
                id: storageId++,
                name: attribute.type,
                type: StorageType.Struct,
                variables,
            };
            storageSections.push(newStorageSection);
            return newStorageSection;
        }
        return undefined;
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping) {
        // get the UserDefined type from the mapping
        // note the mapping could be an array of Structs
        // Could also be a mapping of a mapping
        const result = attribute.type.match(/=\\>((?!mapping)\w*)[\\[]/);
        // If mapping of user defined type
        if (result !== null && result[1] && !(0, exports.isElementary)(result[1])) {
            // Find UserDefined type
            const typeClass = otherClasses.find(({ name }) => name === result[1] || name === result[1].split('.')[1]);
            if (!typeClass) {
                throw Error(`Failed to find user defined type "${result[1]}" in attribute type "${attribute.type}"`);
            }
            if (typeClass.stereotype === umlClass_1.ClassStereotype.Struct) {
                const variables = parseVariables(typeClass, otherClasses, [], storageSections, []);
                const newStorageSection = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageType.Struct,
                    variables,
                };
                storageSections.push(newStorageSection);
                return newStorageSection;
            }
        }
        return undefined;
    }
    return undefined;
};
exports.parseReferenceStorageSection = parseReferenceStorageSection;
// Calculates the storage size of an attribute in bytes
const calcStorageByteSize = (attribute, umlClass, otherClasses) => {
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping ||
        attribute.attributeType === umlClass_1.AttributeType.Function) {
        return { size: 32, dynamic: true };
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Array) {
        // Fixed sized arrays are read from right to left until there is a dynamic dimension
        // eg address[][3][2] is a fixed size array that uses 6 slots.
        // while address [2][] is a dynamic sized array.
        const arrayDimensions = attribute.type.match(/\[\w*]/g);
        // Remove first [ and last ] from each arrayDimensions
        const dimensionsStr = arrayDimensions.map((a) => a.slice(1, -1));
        // fixed-sized arrays are read from right to left so reverse the dimensions
        const dimensionsStrReversed = dimensionsStr.reverse();
        // read fixed-size dimensions until we get a dynamic array with no dimension
        let dimension = dimensionsStrReversed.shift();
        const fixedDimensions = [];
        while (dimension && dimension !== '') {
            const dimensionNum = (0, exports.findDimensionLength)(umlClass, dimension);
            fixedDimensions.push(dimensionNum);
            // read the next dimension for the next loop
            dimension = dimensionsStrReversed.shift();
        }
        // If the first dimension is dynamic, ie []
        if (fixedDimensions.length === 0) {
            // dynamic arrays start at the keccak256 of the slot number
            // the array length is stored in the 32 byte slot
            return { size: 32, dynamic: true };
        }
        let elementSize;
        const type = attribute.type.substring(0, attribute.type.indexOf('['));
        // If a fixed sized array
        if ((0, exports.isElementary)(type)) {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.Elementary,
                type,
                name: 'element',
            };
            ({ size: elementSize } = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses));
        }
        else {
            const elementAttribute = {
                attributeType: umlClass_1.AttributeType.UserDefined,
                type,
                name: 'userDefined',
            };
            ({ size: elementSize } = (0, exports.calcStorageByteSize)(elementAttribute, umlClass, otherClasses));
        }
        // Anything over 16 bytes, like an address, will take a whole 32 byte slot
        if (elementSize > 16 && elementSize < 32) {
            elementSize = 32;
        }
        // If multi dimension, then the first element is 32 bytes
        if (fixedDimensions.length < arrayDimensions.length) {
            const totalDimensions = fixedDimensions.reduce((total, dimension) => total * dimension, 1);
            return {
                size: 32 * totalDimensions,
                dynamic: false,
            };
        }
        const lastItem = fixedDimensions.length - 1;
        const lastDimensionBytes = elementSize * fixedDimensions[lastItem];
        const lastDimensionSlotBytes = Math.ceil(lastDimensionBytes / 32) * 32;
        const remainingDimensions = fixedDimensions
            .slice(0, lastItem)
            .reduce((total, dimension) => total * dimension, 1);
        return {
            size: lastDimensionSlotBytes * remainingDimensions,
            dynamic: false,
        };
    }
    // If a Struct or Enum
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeClass = otherClasses.find(({ name }) => {
            return (name === attribute.type || name === attribute.type.split('.')[1]);
        });
        if (!attributeClass) {
            throw Error(`Failed to find user defined struct or enum "${attribute.type}"`);
        }
        switch (attributeClass.stereotype) {
            case umlClass_1.ClassStereotype.Enum:
                return { size: 1, dynamic: false };
            case umlClass_1.ClassStereotype.Contract:
            case umlClass_1.ClassStereotype.Abstract:
            case umlClass_1.ClassStereotype.Interface:
            case umlClass_1.ClassStereotype.Library:
                return { size: 20, dynamic: false };
            case umlClass_1.ClassStereotype.Struct:
                let structByteSize = 0;
                attributeClass.attributes.forEach((structAttribute) => {
                    // If next attribute is an array, then we need to start in a new slot
                    if (structAttribute.attributeType === umlClass_1.AttributeType.Array) {
                        structByteSize = Math.ceil(structByteSize / 32) * 32;
                    }
                    // If next attribute is an struct, then we need to start in a new slot
                    else if (structAttribute.attributeType ===
                        umlClass_1.AttributeType.UserDefined) {
                        // UserDefined types can be a struct or enum, so we need to check if it's a struct
                        const userDefinedClass = otherClasses.find(({ name }) => {
                            return (name === structAttribute.type ||
                                name === structAttribute.type.split('.')[1]);
                        });
                        if (!userDefinedClass) {
                            throw Error(`Failed to find user defined type "${structAttribute.type}" in struct ${attributeClass.name}`);
                        }
                        // If a struct
                        if (userDefinedClass.stereotype ===
                            umlClass_1.ClassStereotype.Struct) {
                            structByteSize = Math.ceil(structByteSize / 32) * 32;
                        }
                    }
                    const { size: attributeSize } = (0, exports.calcStorageByteSize)(structAttribute, umlClass, otherClasses);
                    // check if attribute will fit into the remaining slot
                    const endCurrentSlot = Math.ceil(structByteSize / 32) * 32;
                    const spaceLeftInSlot = endCurrentSlot - structByteSize;
                    if (attributeSize <= spaceLeftInSlot) {
                        structByteSize += attributeSize;
                    }
                    else {
                        structByteSize = endCurrentSlot + attributeSize;
                    }
                });
                // structs take whole 32 byte slots so round up to the nearest 32 sized slots
                return {
                    size: Math.ceil(structByteSize / 32) * 32,
                    dynamic: false,
                };
            default:
                return { size: 32, dynamic: false };
        }
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Elementary) {
        switch (attribute.type) {
            case 'bool':
                return { size: 1, dynamic: false };
            case 'address':
                return { size: 20, dynamic: false };
            case 'string':
            case 'bytes':
            case 'uint':
            case 'int':
            case 'ufixed':
            case 'fixed':
                return { size: 32, dynamic: false };
            default:
                const result = attribute.type.match(/[u]*(int|fixed|bytes)([0-9]+)/);
                if (result === null || !result[2]) {
                    throw Error(`Failed size elementary type "${attribute.type}"`);
                }
                // If bytes
                if (result[1] === 'bytes') {
                    return { size: parseInt(result[2]), dynamic: false };
                }
                // TODO need to handle fixed types when they are supported
                // If an int
                const bitSize = parseInt(result[2]);
                return { size: bitSize / 8, dynamic: false };
        }
    }
    throw new Error(`Failed to calc bytes size of attribute with name "${attribute.name}" and type ${attribute.type}`);
};
exports.calcStorageByteSize = calcStorageByteSize;
const isElementary = (type) => {
    switch (type) {
        case 'bool':
        case 'address':
        case 'string':
        case 'bytes':
        case 'uint':
        case 'int':
        case 'ufixed':
        case 'fixed':
            return true;
        default:
            const result = type.match(/[u]*(int|fixed|bytes)([0-9]+)/);
            return result !== null;
    }
};
exports.isElementary = isElementary;
const calcSlotKey = (variable) => {
    if (variable.dynamic) {
        const hexStringOf32Bytes = (0, utils_1.hexZeroPad)(ethers_1.BigNumber.from(variable.fromSlot).toHexString(), 32);
        return (0, utils_1.keccak256)(hexStringOf32Bytes);
    }
    return ethers_1.BigNumber.from(variable.fromSlot).toHexString();
};
exports.calcSlotKey = calcSlotKey;
// recursively offset the slots numbers of a variables in the storage section
const offsetStorageSlots = (storageSection, slots, storageSections) => {
    storageSection.variables.forEach((variable) => {
        variable.fromSlot += slots;
        variable.toSlot += slots;
        if (variable.referenceSectionId) {
            // recursively offset the referenced storage
            const referenceStorageSection = storageSections.find((ss) => ss.id === variable.referenceSectionId);
            if (!referenceStorageSection.arrayDynamic) {
                (0, exports.offsetStorageSlots)(referenceStorageSection, slots, storageSections);
            }
            else {
                referenceStorageSection.slotKey = (0, exports.calcSlotKey)(variable);
            }
        }
    });
};
exports.offsetStorageSlots = offsetStorageSlots;
const findDimensionLength = (umlClass, dimension) => {
    const dimensionNum = parseInt(dimension);
    if (Number.isInteger(dimensionNum)) {
        return dimensionNum;
    }
    else {
        // Try and size array dimension from declared constants
        const constant = umlClass.constants.find((constant) => constant.name === dimension);
        if (!constant) {
            throw Error(`Could not size fixed sized array with dimension "${dimension}"`);
        }
        return constant.value;
    }
};
exports.findDimensionLength = findDimensionLength;
/**
 * Calculate if the storage slot value should NOT be retrieved for the attribute.
 * Only retrieve values for Elementary types or dynamic arrays
 * @param attribute
 * @param dynamic flags if the variable is of dynamic size
 * @return noValue true if the slot value should NOT be retrieved
 */
const calcNoValue = (attribute, dynamic) => !(attribute.attributeType === umlClass_1.AttributeType.Elementary ||
    (attribute.attributeType === umlClass_1.AttributeType.Array && dynamic));
//# sourceMappingURL=converterClasses2Storage.js.map