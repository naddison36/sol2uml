"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTypes = exports.validateSlotNames = exports.validateLineBuffer = exports.validateNames = exports.validateAddress = void 0;
const regEx_1 = require("./regEx");
const commander_1 = require("commander");
const ethers_1 = require("ethers");
const converterClasses2Storage_1 = require("../converterClasses2Storage");
const debug = require('debug')('sol2uml');
const validateAddress = (address) => {
    try {
        if (typeof address === 'string' && address?.match(regEx_1.ethereumAddress))
            return (0, ethers_1.getAddress)(address);
    }
    catch { /* validation failed */ }
    throw new commander_1.InvalidArgumentError(`Address must be in hexadecimal format with a 0x prefix.`);
};
exports.validateAddress = validateAddress;
// Splits a comma-separated list of names.
const validateNames = (variables) => {
    try {
        if (typeof variables === 'string' &&
            variables.match(regEx_1.commaSeparatedList))
            return variables.split(',');
    }
    catch { /* validation failed */ }
    throw new commander_1.InvalidArgumentError(`Must be a comma-separate list of names with no white spaces.`);
};
exports.validateNames = validateNames;
const validateLineBuffer = (lineBufferParam) => {
    try {
        const lineBuffer = parseInt(lineBufferParam, 10);
        if (lineBuffer >= 0)
            return lineBuffer;
    }
    catch { /* validation failed */ }
    throw new commander_1.InvalidOptionArgumentError(`Must be a zero or a positive integer.`);
};
exports.validateLineBuffer = validateLineBuffer;
const validateSlotNames = (slotNames) => {
    try {
        const slots = slotNames.split(',');
        const results = slots.map((slot) => {
            if (slot.match(regEx_1.bytes32)) {
                return {
                    name: undefined,
                    offset: slot,
                };
            }
            const offset = (0, ethers_1.keccak256)((0, ethers_1.toUtf8Bytes)(slot));
            debug(`Slot name "${slot}" has hash "${offset}"`);
            return {
                name: slot,
                offset,
            };
        });
        console.log(results.length);
        return results;
    }
    catch { /* validation failed */ }
    throw new commander_1.InvalidOptionArgumentError(`Must be a comma-separate list of slots with no white spaces.`);
};
exports.validateSlotNames = validateSlotNames;
const validateTypes = (typesString) => {
    try {
        if (typeof typesString === 'string') {
            const types = typesString.split(',');
            types.forEach((type) => {
                if (!(0, converterClasses2Storage_1.isElementary)(type)) {
                    throw Error(`"${type}" is not an elementary type`);
                }
            });
            return types;
        }
    }
    catch { /* validation failed */ }
    throw new commander_1.InvalidArgumentError(`Slot type must be an elementary type which includes dynamic and fixed size arrays. eg address, address[], uint256, int256[2], bytes32, string, bool`);
};
exports.validateTypes = validateTypes;
//# sourceMappingURL=validators.js.map