"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDynamicVariables = exports.findDimensionLength = exports.calcSectionOffset = exports.isElementary = exports.calcStorageByteSize = exports.parseStorageSectionFromAttribute = exports.convertClasses2StorageSections = exports.StorageSectionType = void 0;
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const slotValues_1 = require("./slotValues");
const debug = require('debug')('sol2uml');
var StorageSectionType;
(function (StorageSectionType) {
    StorageSectionType["Contract"] = "Contract";
    StorageSectionType["Struct"] = "Struct";
    StorageSectionType["Array"] = "Array";
    StorageSectionType["Bytes"] = "Bytes";
    StorageSectionType["String"] = "String";
})(StorageSectionType = exports.StorageSectionType || (exports.StorageSectionType = {}));
let storageId = 1;
let variableId = 1;
/**
 *
 * @param contractName name of the contract to get storage layout.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param arrayItems the number of items to display at the start and end of an array
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
const convertClasses2StorageSections = (contractName, umlClasses, arrayItems, contractFilename) => {
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
    const variables = parseVariables(umlClass, umlClasses, [], storageSections, [], false, arrayItems);
    // Add new storage section to the beginning of the array
    storageSections.unshift({
        id: storageId++,
        name: contractName,
        type: StorageSectionType.Contract,
        variables: variables,
        mapping: false,
    });
    adjustSlots(storageSections[0], 0, storageSections);
    return storageSections;
};
exports.convertClasses2StorageSections = convertClasses2StorageSections;
/**
 * Recursively parse the storage variables for a given contract or struct.
 * @param umlClass contract or file level struct
 * @param umlClasses other contracts, structs and enums that may be a type of a storage variable.
 * @param variables mutable array of storage variables that are appended to
 * @param storageSections mutable array of storageSection objects
 * @param inheritedContracts mutable array of contracts that have been inherited already
 * @param mapping flags that the storage section is under a mapping
 * @param arrayItems the number of items to display at the start and end of an array
 * @return variables array of storage variables in the `umlClass`
 */
const parseVariables = (umlClass, umlClasses, variables, storageSections, inheritedContracts, mapping, arrayItems) => {
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
        parseVariables(parentClass, umlClasses, variables, storageSections, inheritedContracts, mapping, arrayItems);
    });
    // Parse storage for each attribute
    umlClass.attributes.forEach((attribute) => {
        // Ignore any attributes that are constants or immutable
        if (attribute.compiled)
            return;
        const { size: byteSize, dynamic } = (0, exports.calcStorageByteSize)(attribute, umlClass, umlClasses);
        // parse any dependent storage sections or enums
        const references = (0, exports.parseStorageSectionFromAttribute)(attribute, umlClass, umlClasses, storageSections, mapping || attribute.attributeType === umlClass_1.AttributeType.Mapping, arrayItems);
        // should this new variable get the slot value
        const displayValue = calcDisplayValue(attribute.attributeType, dynamic, mapping, references?.storageSection?.type);
        const getValue = calcGetValue(attribute.attributeType, mapping);
        // Get the toSlot of the last storage item
        const lastVariable = variables[variables.length - 1];
        let lastToSlot = lastVariable ? lastVariable.toSlot : 0;
        let nextOffset = lastVariable
            ? lastVariable.byteOffset + lastVariable.byteSize
            : 0;
        let fromSlot;
        let toSlot;
        let byteOffset;
        if (nextOffset + byteSize > 32) {
            const nextFromSlot = variables.length > 0 ? lastToSlot + 1 : 0;
            fromSlot = nextFromSlot;
            toSlot = nextFromSlot + Math.floor((byteSize - 1) / 32);
            byteOffset = 0;
        }
        else {
            fromSlot = lastToSlot;
            toSlot = lastToSlot;
            byteOffset = nextOffset;
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
            referenceSectionId: references?.storageSection?.id,
            enumValues: references?.enumValues,
        });
    });
    return variables;
};
/**
 * Recursively adjusts the fromSlot and toSlot properties of any storage variables
 * that are referenced by a static array or struct.
 * Also sets the storage slot offset for dynamic arrays, strings and bytes.
 * @param storageSection
 * @param slotOffset
 * @param storageSections
 */
const adjustSlots = (storageSection, slotOffset, storageSections) => {
    storageSection.variables.forEach((variable) => {
        // offset storage slots
        variable.fromSlot += slotOffset;
        variable.toSlot += slotOffset;
        // find storage section that the variable is referencing
        const referenceStorageSection = storageSections.find((ss) => ss.id === variable.referenceSectionId);
        if (referenceStorageSection) {
            referenceStorageSection.offset = storageSection.offset;
            if (!variable.dynamic) {
                adjustSlots(referenceStorageSection, variable.fromSlot, storageSections);
            }
            else if (variable.attributeType === umlClass_1.AttributeType.Array) {
                // attribute is a dynamic array
                referenceStorageSection.offset = (0, exports.calcSectionOffset)(variable, storageSection.offset);
                adjustSlots(referenceStorageSection, 0, storageSections);
            }
        }
    });
};
/**
 * Recursively adds new storage sections under a class attribute.
 * also returns the allowed enum values
 * @param attribute the attribute that is referencing a storage section
 * @param umlClass contract or file level struct
 * @param otherClasses array of all the UML Classes
 * @param storageSections mutable array of storageSection objects
 * @param mapping flags that the storage section is under a mapping
 * @param arrayItems the number of items to display at the start and end of an array
 * @return storageSection new storage section that was added or undefined if none was added.
 * @return enumValues array of allowed enum values. undefined if attribute is not an enum
 */
const parseStorageSectionFromAttribute = (attribute, umlClass, otherClasses, storageSections, mapping, arrayItems) => {
    if (attribute.attributeType === umlClass_1.AttributeType.Array) {
        // storage is dynamic if the attribute type ends in []
        const result = attribute.type.match(/\[([\w$.]*)]$/);
        const dynamic = result[1] === '';
        const arrayLength = !dynamic
            ? (0, exports.findDimensionLength)(umlClass, result[1], otherClasses)
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
            name: attribute.name,
            type: baseType,
            attributeType: baseAttributeType,
        };
        const { size: arrayItemSize, dynamic: dynamicBase } = (0, exports.calcStorageByteSize)(baseAttribute, umlClass, otherClasses);
        // If more than 16 bytes, then round up in 32 bytes increments
        const arraySlotSize = arrayItemSize > 16
            ? 32 * Math.ceil(arrayItemSize / 32)
            : arrayItemSize;
        // If base type is not an Elementary type
        // This can only be Array and UserDefined for base types of arrays.
        let references;
        if (baseAttributeType !== umlClass_1.AttributeType.Elementary) {
            // recursively add storage section for Array and UserDefined types
            references = (0, exports.parseStorageSectionFromAttribute)(baseAttribute, umlClass, otherClasses, storageSections, mapping, arrayItems);
        }
        const displayValue = calcDisplayValue(baseAttribute.attributeType, dynamicBase, mapping, references?.storageSection?.type);
        const getValue = calcGetValue(attribute.attributeType, mapping);
        const variables = [];
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
            referenceSectionId: references?.storageSection?.id,
            enumValues: references?.enumValues,
        };
        // If a fixed size array.
        // Note dynamic arrays will have undefined arrayLength
        if (arrayLength > 1) {
            // Add missing fixed array variables from index 1
            addArrayVariables(arrayLength, arrayItems, variables);
            // For the newly added variables
            variables.forEach((variable, i) => {
                if (i > 0 &&
                    baseAttributeType !== umlClass_1.AttributeType.Elementary &&
                    variable.type !== '----' // ignore any filler variables
                ) {
                    // recursively add storage section for Array and UserDefined types
                    references = (0, exports.parseStorageSectionFromAttribute)(baseAttribute, umlClass, otherClasses, storageSections, mapping, arrayItems);
                    variable.referenceSectionId = references?.storageSection?.id;
                    variable.enumValues = references?.enumValues;
                }
            });
        }
        const storageSection = {
            id: storageId++,
            name: `${attribute.type}: ${attribute.name}`,
            type: StorageSectionType.Array,
            arrayDynamic: dynamic,
            arrayLength,
            variables,
            mapping,
        };
        storageSections.push(storageSection);
        return { storageSection };
    }
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const typeClass = findTypeClass(attribute.type, attribute, otherClasses);
        if (typeClass.stereotype === umlClass_1.ClassStereotype.Struct) {
            const variables = parseVariables(typeClass, otherClasses, [], storageSections, [], mapping, arrayItems);
            const storageSection = {
                id: storageId++,
                name: attribute.type,
                type: StorageSectionType.Struct,
                variables,
                mapping,
            };
            storageSections.push(storageSection);
            return { storageSection };
        }
        else if (typeClass.stereotype === umlClass_1.ClassStereotype.Enum) {
            return {
                storageSection: undefined,
                enumValues: typeClass.attributes.map((a) => a.name),
            };
        }
        return undefined;
    }
    if (attribute.attributeType === umlClass_1.AttributeType.Mapping) {
        // get the UserDefined type from the mapping
        // note the mapping could be an array of Structs
        // Could also be a mapping of a mapping
        const result = attribute.type.match(/=\\>((?!mapping)[\w$.]*)[\\[]/);
        // If mapping of user defined type
        if (result !== null && result[1] && !(0, exports.isElementary)(result[1])) {
            // Find UserDefined type can be a contract, struct or enum
            const typeClass = findTypeClass(result[1], attribute, otherClasses);
            if (typeClass.stereotype === umlClass_1.ClassStereotype.Struct) {
                let variables = parseVariables(typeClass, otherClasses, [], storageSections, [], true, arrayItems);
                const storageSection = {
                    id: storageId++,
                    name: typeClass.name,
                    type: StorageSectionType.Struct,
                    mapping: true,
                    variables,
                };
                storageSections.push(storageSection);
                return { storageSection };
            }
        }
        return undefined;
    }
    return undefined;
};
exports.parseStorageSectionFromAttribute = parseStorageSectionFromAttribute;
/**
 * Adds missing storage variables to a fixed-size or dynamic array by cloning them from the first variable.
 * @param arrayLength the length of the array
 * @param arrayItems the number of items to display at the start and end of an array
 * @param variables  mutable array of storage variables that are appended to
 */
const addArrayVariables = (arrayLength, arrayItems, variables) => {
    const arraySlotSize = variables[0].byteSize;
    const itemsPerSlot = Math.floor(32 / arraySlotSize);
    const slotsPerItem = Math.ceil(arraySlotSize / 32);
    const firstFillerItem = itemsPerSlot > 0 ? arrayItems * itemsPerSlot : arrayItems;
    const lastFillerItem = itemsPerSlot > 0
        ? arrayLength -
            (arrayItems - 1) * itemsPerSlot - // the number of items in all but the last row
            (arrayLength % itemsPerSlot || itemsPerSlot) - // the remaining items in the last row or all the items in a slot
            1 // need the items before the last three rows
        : arrayLength - arrayItems - 1;
    // Add variable from index 1 for each item in the array
    for (let i = 1; i < arrayLength; i++) {
        const fromSlot = itemsPerSlot > 0 ? Math.floor(i / itemsPerSlot) : i * slotsPerItem;
        const toSlot = itemsPerSlot > 0 ? fromSlot : fromSlot + slotsPerItem;
        // add filler variable before adding the first of the last items of the array
        if (i === lastFillerItem && firstFillerItem < lastFillerItem) {
            const fillerFromSlot = itemsPerSlot > 0
                ? Math.floor(firstFillerItem / itemsPerSlot)
                : firstFillerItem * slotsPerItem;
            variables.push({
                id: variableId++,
                attributeType: umlClass_1.AttributeType.UserDefined,
                type: '----',
                fromSlot: fillerFromSlot,
                toSlot: toSlot,
                byteOffset: 0,
                byteSize: (toSlot - fillerFromSlot + 1) * 32,
                getValue: false,
                displayValue: false,
                dynamic: false,
            });
        }
        // Add variables for the first arrayItems and last arrayItems
        if (i < firstFillerItem || i > lastFillerItem) {
            const byteOffset = itemsPerSlot > 0 ? (i % itemsPerSlot) * arraySlotSize : 0;
            const slotValue = fromSlot === 0 ? variables[0].slotValue : undefined;
            // add array variable
            const newVariable = {
                ...variables[0],
                id: variableId++,
                fromSlot,
                toSlot,
                byteOffset,
                slotValue,
                // These will be added in a separate step
                parsedValue: undefined,
                referenceSectionId: undefined,
                enumValues: undefined,
            };
            newVariable.parsedValue = (0, slotValues_1.parseValue)(newVariable);
            variables.push(newVariable);
        }
    }
};
/**
 * Finds an attribute's user defined type that can be a Contract, Struct or Enum
 * @param userType User defined type that is being looked for. This can be the base type of an attribute.
 * @param attribute the attribute in the class that is user defined. This is just used for logging purposes
 * @param otherClasses
 */
const findTypeClass = (userType, attribute, otherClasses) => {
    // Find associated UserDefined type
    // TODO this just matches on name and doesn't take into account imports
    const typeClass = otherClasses.find(({ name }) => name === userType || name === userType.split('.')[1]);
    if (!typeClass) {
        throw Error(`Failed to find user defined type "${userType}" in attribute "${attribute.name}" of type "${attribute.attributeType}""`);
    }
    return typeClass;
};
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
        const arrayDimensions = attribute.type.match(/\[[\w$.]*]/g);
        // Remove first [ and last ] from each arrayDimensions
        const dimensionsStr = arrayDimensions.map((a) => a.slice(1, -1));
        // fixed-sized arrays are read from right to left so reverse the dimensions
        const dimensionsStrReversed = dimensionsStr.reverse();
        // read fixed-size dimensions until we get a dynamic array with no dimension
        let dimension = dimensionsStrReversed.shift();
        const fixedDimensions = [];
        while (dimension && dimension !== '') {
            const dimensionNum = (0, exports.findDimensionLength)(umlClass, dimension, otherClasses);
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
        // If a fixed sized array
        let elementSize;
        const type = attribute.type.substring(0, attribute.type.indexOf('['));
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
        const lastArrayLength = fixedDimensions[lastItem];
        const itemsPerSlot = Math.floor(32 / elementSize);
        const lastDimensionBytes = itemsPerSlot > 0 // if one or more array items in a slot
            ? Math.ceil(lastArrayLength / itemsPerSlot) * 32 // round up to include unallocated slot space
            : elementSize * fixedDimensions[lastItem];
        const lastDimensionSlotBytes = Math.ceil(lastDimensionBytes / 32) * 32;
        const remainingDimensions = fixedDimensions
            .slice(0, lastItem)
            .reduce((total, dimension) => total * dimension, 1);
        return {
            size: lastDimensionSlotBytes * remainingDimensions,
            dynamic: false,
        };
    }
    // If a Struct, Enum or Contract reference
    // TODO need to handle User Defined Value Types when they are added to Solidity
    if (attribute.attributeType === umlClass_1.AttributeType.UserDefined) {
        // Is the user defined type linked to another Contract, Struct or Enum?
        const attributeTypeClass = findTypeClass(attribute.type, attribute, otherClasses);
        switch (attributeTypeClass.stereotype) {
            case umlClass_1.ClassStereotype.Enum:
                return { size: 1, dynamic: false };
            case umlClass_1.ClassStereotype.Contract:
            case umlClass_1.ClassStereotype.Abstract:
            case umlClass_1.ClassStereotype.Interface:
            case umlClass_1.ClassStereotype.Library:
                return { size: 20, dynamic: false };
            case umlClass_1.ClassStereotype.Struct:
                let structByteSize = 0;
                attributeTypeClass.attributes.forEach((structAttribute) => {
                    // If next attribute is an array, then we need to start in a new slot
                    if (structAttribute.attributeType === umlClass_1.AttributeType.Array) {
                        structByteSize = Math.ceil(structByteSize / 32) * 32;
                    }
                    // If next attribute is an struct, then we need to start in a new slot
                    else if (structAttribute.attributeType ===
                        umlClass_1.AttributeType.UserDefined) {
                        // UserDefined types can be a struct or enum, so we need to check if it's a struct
                        const userDefinedClass = findTypeClass(structAttribute.type, structAttribute, otherClasses);
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
                return { size: 32, dynamic: true };
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
            const result = type.match(/^[u]?(int|fixed|bytes)([0-9]+)$/);
            return result !== null;
    }
};
exports.isElementary = isElementary;
const calcSectionOffset = (variable, sectionOffset = '0') => {
    if (variable.dynamic) {
        const hexStringOf32Bytes = (0, utils_1.hexZeroPad)(ethers_1.BigNumber.from(variable.fromSlot).add(sectionOffset).toHexString(), 32);
        return (0, utils_1.keccak256)(hexStringOf32Bytes);
    }
    return ethers_1.BigNumber.from(variable.fromSlot).add(sectionOffset).toHexString();
};
exports.calcSectionOffset = calcSectionOffset;
const findDimensionLength = (umlClass, dimension, otherClasses) => {
    const dimensionNum = parseInt(dimension);
    if (Number.isInteger(dimensionNum)) {
        return dimensionNum;
    }
    // Try and size array dimension from declared constants
    const constant = umlClass.constants.find((constant) => constant.name === dimension);
    if (constant) {
        return constant.value;
    }
    // Try and size array dimension from file constants
    const fileConstant = otherClasses.find((umlClass) => umlClass.name === dimension &&
        umlClass.stereotype === umlClass_1.ClassStereotype.Constant);
    if (fileConstant?.constants[0]?.value) {
        return fileConstant.constants[0].value;
    }
    throw Error(`Could not size fixed sized array with dimension "${dimension}"`);
};
exports.findDimensionLength = findDimensionLength;
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
const calcDisplayValue = (attributeType, dynamic, mapping, storageSectionType) => mapping === false &&
    (attributeType === umlClass_1.AttributeType.Elementary ||
        (attributeType === umlClass_1.AttributeType.UserDefined &&
            storageSectionType !== StorageSectionType.Struct) ||
        (attributeType === umlClass_1.AttributeType.Array && dynamic));
/**
 * Calculate if the storage slot value for the attribute should be retrieved from the chain.
 *
 * Storage sections with true mapping should return false.
 * Mapping types should return false.
 * Elementary types should return true.
 * Array types should return true.
 * UserDefined should return true.
 *
 * @param attributeType the type of attribute the storage variable is for.
 * @param mapping flags if the storage section is referenced by a mapping
 * @return getValue true if the slot value should be retrieved.
 */
const calcGetValue = (attributeType, mapping) => mapping === false && attributeType !== umlClass_1.AttributeType.Mapping;
/**
 * Recursively adds variables for dynamic string, bytes or arrays
 * @param storageSection
 * @param storageSections
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * @param arrayItems the number of items to display at the start and end of an array
 * @param blockTag block number or `latest`
 */
const addDynamicVariables = async (storageSection, storageSections, url, contractAddress, arrayItems, blockTag) => {
    for (const variable of storageSection.variables) {
        try {
            if (!variable.dynamic)
                continue;
            // STEP 1 - add slots for dynamic string and bytes
            if (variable.type === 'string' || variable.type === 'bytes') {
                if (!variable.slotValue) {
                    debug(`WARNING: Variable "${variable.name}" of type "${variable.type}" has no slot value`);
                    continue;
                }
                const size = (0, slotValues_1.dynamicSlotSize)(variable);
                if (size > 31) {
                    const maxSlotNumber = Math.floor((size - 1) / 32);
                    const variables = [];
                    // For each dynamic slot
                    for (let i = 0; i <= maxSlotNumber; i++) {
                        // If the last slot then get the remaining bytes
                        const byteSize = i === maxSlotNumber ? size - 32 * maxSlotNumber : 32;
                        // Add variable for the slot
                        variables.push({
                            id: variableId++,
                            fromSlot: i,
                            toSlot: i,
                            byteSize,
                            byteOffset: 0,
                            type: variable.type,
                            contractName: variable.contractName,
                            attributeType: umlClass_1.AttributeType.Elementary,
                            dynamic: false,
                            getValue: true,
                            displayValue: true,
                        });
                    }
                    // add unallocated variable
                    const unusedBytes = 32 - (size - 32 * maxSlotNumber);
                    if (unusedBytes > 0) {
                        const lastVariable = variables[variables.length - 1];
                        variables.push({
                            ...lastVariable,
                            byteOffset: unusedBytes,
                        });
                        variables[maxSlotNumber] = {
                            id: variableId++,
                            fromSlot: maxSlotNumber,
                            toSlot: maxSlotNumber,
                            byteSize: unusedBytes,
                            byteOffset: 0,
                            type: 'unallocated',
                            attributeType: umlClass_1.AttributeType.UserDefined,
                            contractName: variable.contractName,
                            name: '',
                            dynamic: false,
                            getValue: true,
                            displayValue: false,
                        };
                    }
                    const newStorageSection = {
                        id: storageId++,
                        name: `${variable.type}: ${variable.name}`,
                        offset: (0, exports.calcSectionOffset)(variable, storageSection.offset),
                        type: variable.type === 'string'
                            ? StorageSectionType.String
                            : StorageSectionType.Bytes,
                        arrayDynamic: true,
                        arrayLength: size,
                        variables,
                        mapping: false,
                    };
                    variable.referenceSectionId = newStorageSection.id;
                    // get slot values for new referenced dynamic string or bytes
                    await (0, slotValues_1.addSlotValues)(url, contractAddress, newStorageSection, arrayItems, blockTag);
                    storageSections.push(newStorageSection);
                }
                continue;
            }
            if (variable.attributeType !== umlClass_1.AttributeType.Array)
                continue;
            // STEP 2 - add slots for dynamic arrays
            // find storage section that the variable is referencing
            const referenceStorageSection = storageSections.find((ss) => ss.id === variable.referenceSectionId);
            if (!referenceStorageSection)
                continue;
            // recursively add dynamic variables to referenced array.
            // this could be a fixed-size or dynamic array
            await (0, exports.addDynamicVariables)(referenceStorageSection, storageSections, url, contractAddress, arrayItems, blockTag);
            if (!variable.slotValue) {
                debug(`WARNING: Dynamic array variable "${variable.name}" of type "${variable.type}" has no slot value`);
                continue;
            }
            // Add missing dynamic array variables
            const arrayLength = ethers_1.BigNumber.from(variable.slotValue).toNumber();
            if (arrayLength > 1) {
                // Add missing array variables to the referenced dynamic array
                addArrayVariables(arrayLength, arrayItems, referenceStorageSection.variables);
                // // For the newly added variables
                // referenceStorageSection.variables.forEach((variable, i) => {
                //     if (
                //         referenceStorageSection.variables[0].attributeType !==
                //             AttributeType.Elementary &&
                //         i > 0
                //     ) {
                //         // recursively add storage section for Array and UserDefined types
                //         const references = parseStorageSectionFromAttribute(
                //             baseAttribute,
                //             umlClass,
                //             otherClasses,
                //             storageSections,
                //             mapping,
                //             arrayItems
                //         )
                //         variable.referenceSectionId = references.storageSection?.id
                //         variable.enumValues = references?.enumValues
                //     }
                // })
            }
            // Get missing slot values to the referenced dynamic array
            await (0, slotValues_1.addSlotValues)(url, contractAddress, referenceStorageSection, arrayItems, blockTag);
        }
        catch (err) {
            throw Error(`Failed to add dynamic vars for section "${storageSection.name}", var type "${variable.type}" with value "${variable.slotValue}" from slot ${variable.fromSlot} and section offset ${storageSection.offset}`, { cause: err });
        }
    }
};
exports.addDynamicVariables = addDynamicVariables;
//# sourceMappingURL=converterClasses2Storage.js.map