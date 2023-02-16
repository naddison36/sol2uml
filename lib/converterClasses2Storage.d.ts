import { Attribute, AttributeType, UmlClass } from './umlClass';
import { BigNumberish } from '@ethersproject/bignumber';
export declare enum StorageSectionType {
    Contract = "Contract",
    Struct = "Struct",
    Array = "Array",
    Bytes = "Bytes",
    String = "String"
}
export interface Variable {
    id: number;
    fromSlot: number;
    toSlot: number;
    byteSize: number;
    byteOffset: number;
    type: string;
    attributeType: AttributeType;
    dynamic: boolean;
    name?: string;
    contractName?: string;
    displayValue: boolean;
    getValue?: boolean;
    slotValue?: string;
    parsedValue?: string;
    referenceSectionId?: number;
    enumValues?: string[];
}
export interface StorageSection {
    id: number;
    name: string;
    address?: string;
    offset?: string;
    type: StorageSectionType;
    arrayLength?: number;
    arrayDynamic?: boolean;
    mapping: boolean;
    variables: Variable[];
}
/**
 *
 * @param contractName name of the contract to get storage layout.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param arrayItems the number of items to display at the start and end of an array
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
export declare const convertClasses2StorageSections: (contractName: string, umlClasses: UmlClass[], arrayItems: number, contractFilename?: string) => StorageSection[];
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
export declare const parseStorageSectionFromAttribute: (attribute: Attribute, umlClass: UmlClass, otherClasses: readonly UmlClass[], storageSections: StorageSection[], mapping: boolean, arrayItems: number) => {
    storageSection: StorageSection;
    enumValues?: string[];
};
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: readonly UmlClass[]) => {
    size: number;
    dynamic: boolean;
};
export declare const isElementary: (type: string) => boolean;
export declare const calcSectionOffset: (variable: Variable, sectionOffset?: string) => string;
export declare const findDimensionLength: (umlClass: UmlClass, dimension: string, otherClasses: readonly UmlClass[]) => number;
/**
 * Recursively adds variables for dynamic string, bytes or arrays
 * @param storageSection
 * @param storageSections
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * @param arrayItems the number of items to display at the start and end of an array
 * @param blockTag block number or `latest`
 */
export declare const addDynamicVariables: (storageSection: StorageSection, storageSections: StorageSection[], url: string, contractAddress: string, arrayItems: number, blockTag: BigNumberish) => Promise<void>;
