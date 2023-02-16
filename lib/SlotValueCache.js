"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotValueCache = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const debug = require('debug')('sol2uml');
/**
 * Singleton that caches a mapping of slot keys to values.
 * Assumes all data is read from the same block and contract
 */
class SlotValueCache {
    /**
     * @param slotKeys array of slot numbers or slot keys in hexadecimal format
     * @return cachedValues array of the slot values that are in the cache.
     * @return missingKeys array of the slot keys that are not cached in hexadecimal format.
     */
    static readSlotValues(slotKeys) {
        const cachedValues = [];
        const missingKeys = [];
        slotKeys.forEach((slotKey, i) => {
            const key = bignumber_1.BigNumber.from(slotKey).toHexString();
            if (this.slotCache[key]) {
                cachedValues.push(this.slotCache[key]);
            }
            else {
                missingKeys.push(key);
            }
        });
        return { cachedValues, missingKeys };
    }
    /**
     * Adds the missing slot values to the cache and then returns all slot values from
     * the cache for each of the `slotKeys`.
     * @param slotKeys array of slot numbers or keys in hexadecimal format.
     * @param missingKeys array of the slot keys that are not cached in hexadecimal format.
     * @param missingValues array of slot values in hexadecimal format.
     * @return values array of slot values for each of the `slotKeys`.
     */
    static addSlotValues(slotKeys, missingKeys, missingValues) {
        if (missingKeys?.length !== missingValues?.length) {
            throw Error(`${missingKeys?.length} keys does not match ${missingValues?.length} values`);
        }
        missingKeys.forEach((key, i) => {
            if (!this.slotCache[key]) {
                debug(`cached slot ${key} with ${missingValues[i]}`);
                this.slotCache[key] = missingValues[i];
            }
        });
        return slotKeys.map((slotKey) => {
            const key = bignumber_1.BigNumber.from(slotKey).toHexString();
            // it should find the slot value in the cache. if not it'll return undefined
            return this.slotCache[key];
        });
    }
    /**
     * Used for testing purposes to clear the cache.
     * This allows tests to run against different contracts and blockTags
     */
    static clear() {
        this.slotCache = {};
    }
}
exports.SlotValueCache = SlotValueCache;
// Singleton of cached slot keys mapped to values
SlotValueCache.slotCache = {};
//# sourceMappingURL=SlotValueCache.js.map