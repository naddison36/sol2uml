import {
    StorageSection,
    StorageSectionType,
    Variable,
} from './converterClasses2Storage'
import { AttributeType } from './umlClass'

const debug = require('debug')('sol2uml')

export const convertStorages2Dot = (
    storageSections: StorageSection[],
    options: { data: boolean }
): string => {
    let dotString: string = `
digraph StorageDiagram {
rankdir=LR
color=black
arrowhead=open
node [shape=record, style=filled, fillcolor=gray95 fontname="Courier New"]`

    // process contract and the struct storages
    storageSections.forEach((storage) => {
        dotString = convertStorage2Dot(storage, dotString, options)
    })

    // link contract and structs to structs
    storageSections.forEach((slot) => {
        slot.variables.forEach((storage) => {
            if (storage.referenceSectionId) {
                dotString += `\n ${slot.id}:${storage.id} -> ${storage.referenceSectionId}`
            }
        })
    })

    // Need to close off the last digraph
    dotString += '\n}'

    debug(dotString)

    return dotString
}

export function convertStorage2Dot(
    storageSection: StorageSection,
    dotString: string,
    options: { data: boolean }
): string {
    // write storage header with name and optional address
    dotString += `\n${storageSection.id} [label="${storageSection.name} \\<\\<${
        storageSection.type
    }\\>\\>\\n${storageSection.address || storageSection.offset || ''}`

    dotString += ' | {'

    const startingVariables = storageSection.variables.filter(
        (s) => s.byteOffset === 0
    )

    // write slot numbers
    dotString += '{ slot'
    startingVariables.forEach((variable, i) => {
        if (variable.fromSlot === variable.toSlot) {
            dotString += `| ${variable.fromSlot} `
        } else {
            dotString += `| ${variable.fromSlot}-${variable.toSlot} `
        }
    })

    // write slot values if available
    if (options.data) {
        dotString += '} | {value'
        startingVariables.forEach((variable, i) => {
            dotString += ` | ${variable.slotValue || ''}`
        })
    }

    const contractVariablePrefix =
        storageSection.type === StorageSectionType.Contract
            ? '\\<inherited contract\\>.'
            : ''
    dotString += `} | { type: ${contractVariablePrefix}variable (bytes)`

    // For each slot
    startingVariables.forEach((variable) => {
        // Get all the storage variables in this slot
        const slotVariables = storageSection.variables.filter(
            (s) => s.fromSlot === variable.fromSlot
        )
        const usedBytes = slotVariables.reduce((acc, s) => acc + s.byteSize, 0)
        if (usedBytes < 32) {
            // Create an unallocated variable for display purposes
            slotVariables.push({
                id: 0,
                fromSlot: variable.fromSlot,
                toSlot: variable.fromSlot,
                byteSize: 32 - usedBytes,
                byteOffset: usedBytes,
                type: 'unallocated',
                attributeType: AttributeType.UserDefined,
                dynamic: false,
                getValue: false,
                contractName: variable.contractName,
                name: '',
            })
        }
        const slotVariablesReversed = slotVariables.reverse()

        // For each variable in the slot
        slotVariablesReversed.forEach((variable, i) => {
            if (i === 0) {
                dotString += ` | { ${dotVariable(
                    variable,
                    storageSection.name
                )} `
            } else {
                dotString += ` | ${dotVariable(variable, storageSection.name)} `
            }
        })
        dotString += '}'
    })

    // Need to close off the last label
    dotString += '}}"]\n'

    return dotString
}

const dotVariable = (variable: Variable, contractName: string): string => {
    const port =
        variable.referenceSectionId !== undefined ? `<${variable.id}>` : ''
    const contractNamePrefix =
        variable.contractName !== contractName
            ? `${variable.contractName}.`
            : ''

    const variableName = variable.name
        ? `: ${contractNamePrefix}${variable.name}`
        : ''
    return `${port} ${variable.type}${variableName} (${variable.byteSize})`
}
