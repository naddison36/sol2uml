import { BigNumberish } from '@ethersproject/bignumber';
import { StorageSection, Variable } from './converterClasses2Storage';
/**
 * Adds the slot values to the variables in the storage section.
 * This can be rerun for a section as it will only get if the slot value
 * does not exist.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If contract is proxied, use proxy and not the implementation contract.
 * @param storageSection is mutated with the slot values added to the variables
 * @param arrayItems the number of items to display at the start and end of an array
 * @param blockTag block number or `latest`
 */
export declare const addSlotValues: (url: string, contractAddress: string, storageSection: StorageSection, arrayItems: number, blockTag: BigNumberish) => Promise<void>;
export declare const parseValue: (variable: Variable) => string;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKeys array of 32 byte slot keys as BigNumbers.
 * @param blockTag block number or `latest`
 * @return slotValues array of 32 byte slot values as hexadecimal strings
 */
export declare const getSlotValues: (url: string, contractAddress: string, slotKeys: readonly BigNumberish[], blockTag?: BigNumberish | 'latest') => Promise<string[]>;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKey 32 byte slot key as a BigNumber.
 * @param blockTag block number or `latest`
 * @return slotValue 32 byte slot value as hexadecimal string
 */
export declare const getSlotValue: (url: string, contractAddress: string, slotKey: BigNumberish, blockTag: BigNumberish | 'latest') => Promise<string>;
/**
 * Calculates the number of string characters or bytes of a string or bytes type.
 * See the following for how string and bytes are stored in storage slots
 * https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#bytes-and-string
 * @param variable the variable with the slotValue that is being sized
 * @return bytes the number of bytes of the dynamic slot. If static, zero is return.
 */
export declare const dynamicSlotSize: (variable: {
    name?: string;
    type?: string;
    slotValue?: string;
}) => number;
export declare const convert2String: (bytes: string) => string;
export declare const escapeString: (text: string) => string;
