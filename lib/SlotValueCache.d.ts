import { BigNumberish } from '@ethersproject/bignumber';
/**
 * Singleton that caches a mapping of slot keys to values.
 * Assumes all data is read from the same block and contract
 */
export declare class SlotValueCache {
    private static slotCache;
    /**
     * @param slotKeys array of slot numbers or slot keys in hexadecimal format
     * @return cachedValues array of the slot values that are in the cache.
     * @return missingKeys array of the slot keys that are not cached in hexadecimal format.
     */
    static readSlotValues(slotKeys: readonly BigNumberish[]): {
        cachedValues: string[];
        missingKeys: string[];
    };
    /**
     * Adds the missing slot values to the cache and then returns all slot values from
     * the cache for each of the `slotKeys`.
     * @param slotKeys array of slot numbers or keys in hexadecimal format.
     * @param missingKeys array of the slot keys that are not cached in hexadecimal format.
     * @param missingValues array of slot values in hexadecimal format.
     * @return values array of slot values for each of the `slotKeys`.
     */
    static addSlotValues(slotKeys: readonly BigNumberish[], missingKeys: readonly string[], missingValues: readonly string[]): string[];
    /**
     * Used for testing purposes to clear the cache.
     * This allows tests to run against different contracts and blockTags
     */
    static clear(): void;
}
