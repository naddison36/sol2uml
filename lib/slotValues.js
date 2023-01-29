"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageValue = exports.getStorageValues = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const axios_1 = __importDefault(require("axios"));
const debug = require('debug')('sol2uml');
let jsonRpcId = 0;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slots array of slot numbers to retrieve values for.
 * @param blockTag block number or `latest`
 */
const getStorageValues = async (url, contractAddress, slots, blockTag = 'latest') => {
    try {
        if (slots.length === 0) {
            return [];
        }
        debug(`About to get ${slots.length} storage values for ${contractAddress} at block ${blockTag} starting at slot ${slots[0].toString()}`);
        const block = blockTag === 'latest'
            ? blockTag
            : bignumber_1.BigNumber.from(blockTag).toHexString();
        const payload = slots.map((slot) => ({
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
        if (response.data.length !== slots.length) {
            throw new Error(`Requested ${slots.length} storage slot values but only got ${response.data.length}`);
        }
        const responseData = response.data;
        const sortedResponses = responseData.sort((a, b) => bignumber_1.BigNumber.from(a.id).gt(b.id) ? 1 : -1);
        return sortedResponses.map((data) => '0x' + data.result.toUpperCase().slice(2));
    }
    catch (err) {
        throw new Error(`Failed to get ${slots.length} storage values for contract ${contractAddress} from ${url}`, { cause: err });
    }
};
exports.getStorageValues = getStorageValues;
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slot slot number to retrieve the value for.
 * @param blockTag block number or `latest`
 */
const getStorageValue = async (url, contractAddress, slot, blockTag = 'latest') => {
    debug(`About to get storage slot ${slot} value for ${contractAddress}`);
    const values = await (0, exports.getStorageValues)(url, contractAddress, [slot], blockTag);
    debug(`Got slot ${slot} value: ${values[0]}`);
    return values[0];
};
exports.getStorageValue = getStorageValue;
//# sourceMappingURL=slotValues.js.map