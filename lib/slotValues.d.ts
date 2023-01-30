import { BigNumberish } from '@ethersproject/bignumber';
import { StorageSection } from './converterClasses2Storage';
/**
 * Adds the slot values to the variables in the storage section.
 * This can be rerun for a section as it will only get if the slot value
 * does not exist.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If contract is proxied, use proxy and not the implementation contract.
 * @param storageSection is mutated with the slot values added to the variables
 * @param blockTag block number or `latest`
 */
export declare const addSlotValues: (url: string, contractAddress: string, storageSection: StorageSection, blockTag?: BigNumberish | 'latest') => Promise<void>;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKeys array of 32 byte slot keys as BigNumbers.
 * @param blockTag block number or `latest`
 * @return slotValues array of 32 byte slot values as hexadecimal strings
 */
export declare const getSlotValues: (url: string, contractAddress: string, slotKeys: BigNumberish[], blockTag?: BigNumberish | 'latest') => Promise<string[]>;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKey 32 byte slot key as a BigNumber.
 * @param blockTag block number or `latest`
 * @return slotValue 32 byte slot value as hexadecimal string
 */
export declare const getSlotValue: (url: string, contractAddress: string, slotKey: BigNumberish, blockTag?: BigNumberish | 'latest') => Promise<string>;
export declare const dynamicSlotSize: (slotValue: string) => number;
