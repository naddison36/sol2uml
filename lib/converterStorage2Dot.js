"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertStorage2Dot = exports.convertStorages2Dot = void 0;
const converterClasses2Storage_1 = require("./converterClasses2Storage");
const umlClass_1 = require("./umlClass");
const debug = require('debug')('sol2uml');
const convertStorages2Dot = (storageSections, options) => {
    let dotString = `
digraph StorageDiagram {
rankdir=LR
arrowhead=open
bgcolor="${options.backColor}"
edge [color="${options.shapeColor}"]
node [shape=record, style=filled, color="${options.shapeColor}", fillcolor="${options.fillColor}", fontcolor="${options.textColor}", fontname="Courier New"]`;
    // process contract and the struct storages
    storageSections.forEach((storage) => {
        dotString = convertStorage2Dot(storage, dotString, options);
    });
    // link contract and structs to structs
    storageSections.forEach((slot) => {
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
function convertStorage2Dot(storageSection, dotString, options) {
    // write storage header with name and optional address
    dotString += `\n${storageSection.id} [label="${storageSection.name} \\<\\<${storageSection.type}\\>\\>\\n${storageSection.address || storageSection.offset || ''}`;
    dotString += ' | {';
    const startingVariables = storageSection.variables.filter((s) => s.byteOffset === 0);
    // for each slot displayed, does is have any variables with parsed data?
    const displayData = startingVariables.map((startVar) => storageSection.variables.some((variable) => variable.fromSlot === startVar.fromSlot && variable.parsedValue));
    const linePad = '\\n\\ ';
    // write slot numbers
    const dataLine = options.data ? linePad : '';
    dotString +=
        storageSection.offset || storageSection.mapping
            ? `{ offset${dataLine}`
            : `{ slot${dataLine}`;
    startingVariables.forEach((variable, i) => {
        const dataLine = options.data && displayData[i] ? linePad : '';
        if (variable.fromSlot === variable.toSlot) {
            dotString += ` | ${variable.fromSlot}${dataLine}`;
        }
        else {
            dotString += ` | ${variable.fromSlot}-${variable.toSlot}${dataLine}`;
        }
    });
    // write slot values if available
    if (options.data) {
        dotString += `} | {value${dataLine}`;
        startingVariables.forEach((variable, i) => {
            if (displayData[i]) {
                dotString += ` | ${variable.slotValue || ''}${linePad}`;
            }
            else {
                dotString += ` | `;
            }
        });
    }
    const contractVariablePrefix = storageSection.type === converterClasses2Storage_1.StorageSectionType.Contract
        ? '\\<inherited contract\\>.'
        : '';
    const dataLine2 = options.data ? `\\ndecoded data` : '';
    dotString += `} | { type: ${contractVariablePrefix}variable (bytes)${dataLine2}`;
    // For each slot
    startingVariables.forEach((variable) => {
        // Get all the storage variables in this slot
        const slotVariables = storageSection.variables.filter((s) => s.fromSlot === variable.fromSlot);
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
                displayValue: false,
                getValue: false,
                contractName: variable.contractName,
                name: '',
            });
        }
        const slotVariablesReversed = slotVariables.reverse();
        // For each variable in the slot
        slotVariablesReversed.forEach((variable, i) => {
            if (i === 0) {
                dotString += ` | { ${dotVariable(variable, storageSection.name)} `;
            }
            else {
                dotString += ` | ${dotVariable(variable, storageSection.name)} `;
            }
        });
        dotString += '}';
    });
    // Need to close off the last label
    dotString += '}}"]\n';
    return dotString;
}
exports.convertStorage2Dot = convertStorage2Dot;
const dotVariable = (variable, contractName) => {
    const port = variable.referenceSectionId !== undefined ? `<${variable.id}>` : '';
    const contractNamePrefix = variable.contractName !== contractName
        ? `${variable.contractName}.`
        : '';
    const variableValue = variable.parsedValue
        ? `\\n\\ ${variable.parsedValue}`
        : '';
    const variableName = variable.name
        ? `: ${contractNamePrefix}${variable.name}`
        : '';
    return `${port} ${variable.type}${variableName} (${variable.byteSize})${variableValue}`;
};
//# sourceMappingURL=converterStorage2Dot.js.map