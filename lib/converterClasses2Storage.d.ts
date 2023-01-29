import { Attribute, AttributeType, UmlClass } from './umlClass';
import { BigNumberish } from '@ethersproject/bignumber';
export declare enum StorageSectionType {
    Contract = "Contract",
    Struct = "Struct",
    Array = "Array"
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
    variable?: string;
    contractName?: string;
    getValue: boolean;
    value?: string;
    referenceSectionId?: number;
    enumId?: number;
}
export interface StorageSection {
    id: number;
    name: string;
    address?: string;
    offset?: string;
    type: StorageSectionType;
    arrayLength?: number;
    arrayDynamic?: boolean;
    variables: Variable[];
}
/**
 *
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If contract is proxied, use proxy and not the implementation contract.
 * @param storageSection is mutated with the storage values
 * @param blockTag block number or `latest`
 */
export declare const addStorageValues: (url: string, contractAddress: string, storageSection: StorageSection, blockTag?: BigNumberish | 'latest') => Promise<void>;
/**
 *
 * @param contractName name of the contract to get storage layout.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param contractFilename relative path of the contract in the file system
 * @return storageSections array of storageSection objects
 */
export declare const convertClasses2StorageSections: (contractName: string, umlClasses: UmlClass[], contractFilename?: string) => StorageSection[];
export declare const parseReferenceStorageSection: (attribute: Attribute, umlClass: UmlClass, otherClasses: UmlClass[], storageSections: StorageSection[]) => StorageSection | undefined;
export declare const calcStorageByteSize: (attribute: Attribute, umlClass: UmlClass, otherClasses: UmlClass[]) => {
    size: number;
    dynamic: boolean;
};
export declare const isElementary: (type: string) => boolean;
export declare const calcSectionOffset: (variable: Variable) => string | undefined;
export declare const findDimensionLength: (umlClass: UmlClass, dimension: string, otherClasses: UmlClass[]) => number;
export declare const addDynamicArrayVariables: (storageSection: StorageSection, storageSections: StorageSection[]) => void;
