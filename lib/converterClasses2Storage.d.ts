import { Attribute, UmlClass } from './umlClass';
import { BigNumberish } from '@ethersproject/bignumber';
export declare enum StorageType {
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
    dynamic: boolean;
    variable?: string;
    contractName?: string;
    noValue: boolean;
    value?: string;
    referenceStorageId?: number;
    enumId?: number;
}
export interface StorageSection {
    id: number;
    name: string;
    address?: string;
    slotKey?: string;
    type: StorageType;
    arrayLength?: number;
    arrayDynamic?: boolean;
    variables: Variable[];
}
/**
 *
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
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
export declare const calcSlotKey: (variable: Variable) => string | undefined;
export declare const offsetStorageSlots: (storageSection: StorageSection, slots: number, storageSections: StorageSection[]) => void;
export declare const findDimensionLength: (umlClass: UmlClass, dimension: string) => number;
