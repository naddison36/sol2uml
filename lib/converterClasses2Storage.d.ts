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
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
export declare const convertClasses2StorageSections: (contractName: string, umlClasses: UmlClass[], contractFilename?: string) => StorageSection[];
/**
 * Recursively adds new storage sections under a class attribute.
 * @param attribute the attribute that is referencing a storage section
 * @param umlClass contract or file level struct
 * @param otherClasses array of all the UML Classes
 * @param storageSections mutable array of storageSection objects
 * @param mapping flags that the storage section is under a mapping
 * @return storageSection new storage section that was added or undefined if none was added.
 */
export declare const parseStorageSectionFromAttribute: (attribute: Attribute, umlClass: UmlClass, otherClasses: readonly UmlClass[], storageSections: StorageSection[], mapping: boolean) => StorageSection | undefined;
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: readonly UmlClass[]) => {
    size: number;
    dynamic: boolean;
};
export declare const isElementary: (type: string) => boolean;
export declare const calcSectionOffset: (variable: Variable) => string | undefined;
export declare const findDimensionLength: (umlClass: UmlClass, dimension: string, otherClasses: readonly UmlClass[]) => number;
export declare const addDynamicVariables: (storageSection: StorageSection, storageSections: StorageSection[], url: string, storageAddress: string, blockTag?: BigNumberish | 'latest') => Promise<void>;
