"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSolidityVersion = exports.isAddress = void 0;
const isAddress = (input) => {
    return input.match(/^0x([A-Fa-f0-9]{40})$/) !== null;
};
exports.isAddress = isAddress;
const parseSolidityVersion = (compilerVersion) => {
    const result = compilerVersion.match(`v(\\d+.\\d+.\\d+)`);
    if (result[1]) {
        return result[1];
    }
    throw Error(`Failed to parse compiler version ${compilerVersion}`);
};
exports.parseSolidityVersion = parseSolidityVersion;
//# sourceMappingURL=regEx.js.map