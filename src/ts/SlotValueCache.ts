import { BigNumber, BigNumberish } from '@ethersproject/bignumber'

const debug = require('debug')('sol2uml')

// key is the storage slot number in hexadecimal format with a leading 0x. eg 0x0, 0x1...
type SlotCache = { [key: string]: string }

/**
 * Singleton that caches a mapping of slot keys to values.
 * Assumes all data is read from the same block and contract
 */
export class SlotValueCache {
    // Singleton of cached slot keys mapped to values
    private static slotCache: SlotCache = {}

    /**
     * @param slotKeys array of slot numbers or slot keys in hexadecimal format
     * @return cachedValues array of the slot values that are in the cache.
     * @return missingKeys array of the slot keys that are not cached in hexadecimal format.
     */
    public static readSlotValues(slotKeys: readonly BigNumberish[]): {
        cachedValues: string[]
        missingKeys: string[]
    } {
        const cachedValues: string[] = []
        const missingKeys: string[] = []
        slotKeys.forEach((slotKey, i) => {
            const key = BigNumber.from(slotKey).toHexString()
            if (this.slotCache[key]) {
                cachedValues.push(this.slotCache[key])
            } else {
                missingKeys.push(key)
            }
        })

        return { cachedValues, missingKeys }
    }

    /**
     * Adds the missing slot values to the cache and then returns all slot values from
     * the cache for each of the `slotKeys`.
     * @param slotKeys array of slot numbers or keys in hexadecimal format.
     * @param missingKeys array of the slot keys that are not cached in hexadecimal format.
     * @param missingValues array of slot values in hexadecimal format.
     * @return values array of slot values for each of the `slotKeys`.
     */
    public static addSlotValues(
        slotKeys: readonly BigNumberish[],
        missingKeys: readonly string[],
        missingValues: readonly string[]
    ): string[] {
        if (missingKeys?.length !== missingValues?.length) {
            throw Error(
                `${missingKeys?.length} keys does not match ${missingValues?.length} values`
            )
        }
        missingKeys.forEach((key, i) => {
            if (!this.slotCache[key]) {
                debug(`cached slot ${key} with ${missingValues[i]}`)
                this.slotCache[key] = missingValues[i]
            }
        })
        return slotKeys.map((slotKey) => {
            const key = BigNumber.from(slotKey).toHexString()
            // it should find the slot value in the cache. if not it'll return undefined
            return this.slotCache[key]
        })
    }

    /**
     * Used for testing purposes to clear the cache.
     * This allows tests to run against different contracts and blockTags
     */
    public static clear() {
        this.slotCache = {}
    }
}
