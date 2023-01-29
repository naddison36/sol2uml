"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertStorage2Dot = exports.convertStorages2Dot = void 0;
const converterClasses2Storage_1 = require("./converterClasses2Storage");
const umlClass_1 = require("./umlClass");
const debug = require('debug')('sol2uml');
const convertStorages2Dot = (storages, options) => {
    let dotString = `
digraph StorageDiagram {
rankdir=LR
color=black
arrowhead=open
node [shape=record, style=filled, fillcolor=gray95 fontname="Courier New"]`;
    // process contract and the struct storages
    storages.forEach((storage) => {
        dotString = convertStorage2Dot(storage, dotString, options);
    });
    // link contract and structs to structs
    storages.forEach((slot) => {
        slot.variables.forEach((storage) => {
            if (storage.referenceSectionId) {
                dotString += `\n ${slot.id}:${storage.id} -> ${storage.referenceSectionId}`;
            }
        });
    });
    // Need to close off the last digraph
    dotString += '\n}';
    debug(dotString);
    return dotString;
};
exports.convertStorages2Dot = convertStorages2Dot;
function convertStorage2Dot(storage, dotString, options) {
    // write storage header with name and optional address
    dotString += `\n${storage.id} [label="${storage.name} \\<\\<${storage.type}\\>\\>\\n${storage.address || storage.offset || ''}`;
    dotString += ' | {';
    const startingVariables = storage.variables.filter((s) => s.byteOffset === 0);
    // write slot numbers
    dotString += '{ slot';
    startingVariables.forEach((variable, i) => {
        if (variable.fromSlot === variable.toSlot) {
            dotString += `| ${variable.fromSlot} `;
        }
        else {
            dotString += `| ${variable.fromSlot}-${variable.toSlot} `;
        }
    });
    // write slot values if available
    if (options.data) {
        dotString += '} | {value';
        startingVariables.forEach((variable, i) => {
            dotString += ` | ${variable.value || ''}`;
        });
    }
    const contractVariablePrefix = storage.type === converterClasses2Storage_1.StorageSectionType.Contract
        ? '\\<inherited contract\\>.'
        : '';
    dotString += `} | { type: ${contractVariablePrefix}variable (bytes)`;
    // For each slot
    startingVariables.forEach((variable) => {
        // Get all the storage variables in this slot
        const slotVariables = storage.variables.filter((s) => s.fromSlot === variable.fromSlot);
        const usedBytes = slotVariables.reduce((acc, s) => acc + s.byteSize, 0);
        if (usedBytes < 32) {
            // Create an unallocated variable for display purposes
            slotVariables.push({
                id: 0,
                fromSlot: variable.fromSlot,
                toSlot: variable.fromSlot,
                byteSize: 32 - usedBytes,
                byteOffset: usedBytes,
                type: 'unallocated',
                attributeType: umlClass_1.AttributeType.UserDefined,
                dynamic: false,
                getValue: false,
                contractName: variable.contractName,
                variable: '',
            });
        }
        const slotVariablesReversed = slotVariables.reverse();
        // For each variable in the slot
        slotVariablesReversed.forEach((variable, i) => {
            if (i === 0) {
                dotString += ` | { ${dotVariable(variable, storage.name)} `;
            }
            else {
                dotString += ` | ${dotVariable(variable, storage.name)} `;
            }
        });
        dotString += '}';
    });
    // Need to close off the last label
    dotString += '}}"]\n';
    return dotString;
}
exports.convertStorage2Dot = convertStorage2Dot;
const dotVariable = (storage, contractName) => {
    const port = storage.referenceSectionId !== undefined ? `<${storage.id}>` : '';
    const contractNamePrefix = storage.contractName !== contractName ? `${storage.contractName}.` : '';
    const variable = storage.variable
        ? `: ${contractNamePrefix}${storage.variable}`
        : '';
    return `${port} ${storage.type}${variable} (${storage.byteSize})`;
};
//# sourceMappingURL=converterStorage2Dot.js.map