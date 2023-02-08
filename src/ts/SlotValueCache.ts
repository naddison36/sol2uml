import { BigNumber, BigNumberish } from '@ethersproject/bignumber'

type SlotCache = { [key: string]: string }

/**
 * Caches storage slot key values pairs.
 * Assumes all data is read from the same block and contract
 */
export class SlotValueCache {
    // key is the storage slot number in hexadecimal format with a leading 0x. eg 0x0, 0x1...
    private static slotCache: SlotCache = {}

    /**
     * @param slotKeys array of slot numbers or slot keys in hexadecimal format
     * @return missingKeys array of the slot keys that are not cached in hexadecimal format.
     */
    public static missingSlotKeys(slotKeys: readonly BigNumberish[]): string[] {
        const cachedKeyValueMap: { [key: string]: string } = {}
        const missingKeys: string[] = []
        slotKeys.forEach((slotKey, i) => {
            const key = BigNumber.from(slotKey).toHexString()
            if (this.slotCache[key]) {
                cachedKeyValueMap[key] = this.slotCache[key]
            } else {
                missingKeys.push(key)
            }
        })

        return missingKeys
    }

    /**
     * Adds the missing slot values to the cache and then returns all slot values from
     * the cache for each of the `slotKeys`.
     * @param slotKeys array of slot numbers or keys in hexadecimal format.
     * @param missingKeys array of the slot keys that are not cached in hexadecimal format.
     * @param missingValues array of slot values in hexadecimal format.
     * @return mergedValues the slot values from the cache.
     */
    public static addCache(
        slotKeys: readonly BigNumberish[],
        missingKeys: readonly string[],
        missingValues: readonly string[]
    ) {
        if (missingKeys?.length !== missingValues?.length) {
            throw Error(
                `${missingKeys?.length} keys does not match ${missingValues?.length} values`
            )
        }
        missingKeys.forEach((key, i) => {
            if (!this.slotCache[key]) {
                this.slotCache[key] = missingValues[i]
            }
        })
        const mergedValues: string[] = []
        slotKeys.forEach((slotKey) => {
            const key = BigNumber.from(slotKey).toHexString()
            mergedValues.push(this.slotCache[key])
        })
        return mergedValues
    }
}
