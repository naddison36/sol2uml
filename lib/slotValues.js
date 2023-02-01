"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicSlotSize = exports.getSlotValue = exports.getSlotValues = exports.parseValue = exports.addSlotValues = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const axios_1 = __importDefault(require("axios"));
const umlClass_1 = require("./umlClass");
const utils_1 = require("ethers/lib/utils");
const debug = require('debug')('sol2uml');
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
const addSlotValues = async (url, contractAddress, storageSection, blockTag) => {
    const valueVariables = storageSection.variables.filter((variable) => variable.getValue && !variable.slotValue);
    if (valueVariables.length === 0)
        return;
    const fromSlots = valueVariables.map((variable) => variable.fromSlot);
    // remove duplicate slot numbers
    const uniqueFromSlots = [...new Set(fromSlots)];
    // Convert slot numbers to BigNumbers and offset dynamic arrays
    let slotKeys = uniqueFromSlots.map((fromSlot) => {
        if (storageSection.offset) {
            return bignumber_1.BigNumber.from(storageSection.offset).add(fromSlot);
        }
        return bignumber_1.BigNumber.from(fromSlot);
    });
    // Get the contract slot values from the node provider
    const values = await (0, exports.getSlotValues)(url, contractAddress, slotKeys, blockTag);
    // For each slot value retrieved
    values.forEach((value, i) => {
        // Get the corresponding slot number for the slot value
        const fromSlot = uniqueFromSlots[i];
        // For each variable in the storage section
        for (const variable of storageSection.variables) {
            if (variable.fromSlot === fromSlot) {
                variable.slotValue = value;
                // parse variable value from slot data
                variable.parsedValue = (0, exports.parseValue)(variable);
            }
            // if variable is past the slot that has the value
            else if (variable.toSlot > fromSlot) {
                break;
            }
        }
    });
};
exports.addSlotValues = addSlotValues;
const parseValue = (variable) => {
    if (variable.attributeType !== umlClass_1.AttributeType.Elementary)
        return undefined;
    const start = 66 - (variable.byteOffset + variable.byteSize) * 2;
    const end = 66 - variable.byteOffset * 2;
    const variableValue = variable.slotValue.substring(start, end);
    try {
        // TODO dynamic arrays
        if (variable.type === 'bool') {
            if (variableValue === '00')
                return 'false';
            if (variableValue === '01')
                return 'true';
            debug(`Failed to parse bool variable ${variable.name} with value "${variableValue}"`);
            return undefined;
            // TODO throw rather than log once testing has finished
            // throw Error(`Failed to parse bool variable ${variable.name} with value "${variableValue}"`)
        }
        if (variable.type === 'string' || variable.type === 'bytes') {
            if (variable.dynamic) {
                const lastByte = variable.slotValue.slice(-2);
                const size = bignumber_1.BigNumber.from('0x' + lastByte).toNumber();
                if (size <= 0)
                    return '';
                if (size > 62) {
                    // Return the number of chars or bytes
                    return bignumber_1.BigNumber.from(variable.slotValue)
                        .sub(1)
                        .div(2)
                        .toString();
                }
                const hexValue = '0x' + variableValue.slice(0, size);
                if (variable.type === 'bytes')
                    return hexValue;
                return `\\"${(0, utils_1.toUtf8String)(hexValue)}\\"`;
            }
            if (variable.type === 'bytes')
                return '0x' + variableValue;
            return `\\"${(0, utils_1.toUtf8String)('0x' + variableValue)}\\"`;
        }
        if (variable.type === 'address') {
            return '0x' + variableValue;
        }
        if (variable.type.match(/^uint([0-9]*)$/)) {
            const parsedValue = (0, utils_1.formatUnits)('0x' + variableValue, 0);
            return (0, utils_1.commify)(parsedValue);
        }
        if (variable.type.match(/^bytes([0-9]+)$/)) {
            return '0x' + variableValue;
        }
        if (variable.type.match(/^int([0-9]*)/)) {
            // parse variable value as an unsigned number
            let rawValue = bignumber_1.BigNumber.from('0x' + variableValue);
            // parse the number of bits
            const result = variable.type.match(/^int([0-9]*$)/);
            const bitSize = result[1] ? result[1] : 256;
            // Convert the number of bits to the number of hex characters
            const hexSize = bignumber_1.BigNumber.from(bitSize).div(4).toNumber();
            // bit mask has a leading 1 and the rest 0. 0x8 = 1000 binary
            const mask = '0x80' + '0'.repeat(hexSize - 2);
            // is the first bit a 1?
            const negative = rawValue.and(mask);
            if (negative.gt(0)) {
                // Convert unsigned number to a signed negative
                const negativeOne = '0xFF' + 'F'.repeat(hexSize - 2);
                rawValue = bignumber_1.BigNumber.from(negativeOne)
                    .sub(rawValue)
                    .add(1)
                    .mul(-1);
            }
            const parsedValue = (0, utils_1.formatUnits)(rawValue, 0);
            return (0, utils_1.commify)(parsedValue);
        }
        // add fixed point numbers when they are supported by Solidity
        return undefined;
    }
    catch (err) {
        // TODO throw rather than log once testing has finished
        debug(`Failed to parse variable ${variable.name} of type ${variable.type}, value "${variableValue}"`);
        // throw Error(
        //     `Failed to parse variable ${variable.name} of type ${variable.type}, value "${variableValue}"`,
        //     { cause: err }
        // )
        return undefined;
    }
};
exports.parseValue = parseValue;
let jsonRpcId = 0;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKeys array of 32 byte slot keys as BigNumbers.
 * @param blockTag block number or `latest`
 * @return slotValues array of 32 byte slot values as hexadecimal strings
 */
const getSlotValues = async (url, contractAddress, slotKeys, blockTag = 'latest') => {
    try {
        if (slotKeys.length === 0) {
            return [];
        }
        debug(`About to get ${slotKeys.length} storage values for ${contractAddress} at block ${blockTag} starting at slot ${slotKeys[0].toString()}`);
        const block = blockTag === 'latest'
            ? blockTag
            : bignumber_1.BigNumber.from(blockTag).toHexString();
        const payload = slotKeys.map((slot) => ({
            id: (jsonRpcId++).toString(),
            jsonrpc: '2.0',
            method: 'eth_getStorageAt',
            params: [
                contractAddress,
                bignumber_1.BigNumber.from(slot).toHexString(),
                block,
            ],
        }));
        const response = await axios_1.default.post(url, payload);
        console.log(response.data);
        if (response.data?.error?.message) {
            throw new Error(response.data.error.message);
        }
        if (response.data.length !== slotKeys.length) {
            throw new Error(`Requested ${slotKeys.length} storage slot values but only got ${response.data.length}`);
        }
        const responseData = response.data;
        const sortedResponses = responseData.sort((a, b) => bignumber_1.BigNumber.from(a.id).gt(b.id) ? 1 : -1);
        return sortedResponses.map((data) => '0x' + data.result.toUpperCase().slice(2));
    }
    catch (err) {
        throw new Error(`Failed to get ${slotKeys.length} storage values for contract ${contractAddress} from ${url}`, { cause: err });
    }
};
exports.getSlotValues = getSlotValues;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKey 32 byte slot key as a BigNumber.
 * @param blockTag block number or `latest`
 * @return slotValue 32 byte slot value as hexadecimal string
 */
const getSlotValue = async (url, contractAddress, slotKey, blockTag = 'latest') => {
    debug(`About to get storage slot ${slotKey} value for ${contractAddress}`);
    const values = await (0, exports.getSlotValues)(url, contractAddress, [slotKey], blockTag);
    debug(`Got slot ${slotKey} value: ${values[0]}`);
    return values[0];
};
exports.getSlotValue = getSlotValue;
/**
 * See the following for how string and bytes are stored in storage slots
 * https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#bytes-and-string
 * @param slotValue the slot value in hexadecimal format
 * @return bytes the number of bytes of the dynamic slot. If static, zero is return.
 */
const dynamicSlotSize = (slotValue) => {
    const last4bits = '0x' + slotValue.slice(-1);
    const last4bitsNum = bignumber_1.BigNumber.from(last4bits).toNumber();
    // If the last 4 bits is an even number then it's not a dynamic slot
    if (last4bitsNum % 2 === 0)
        return 0;
    const sizeRaw = bignumber_1.BigNumber.from(slotValue).toNumber();
    // Adjust the size to bytes
    return (sizeRaw - 1) / 2;
};
exports.dynamicSlotSize = dynamicSlotSize;
//# sourceMappingURL=slotValues.js.map