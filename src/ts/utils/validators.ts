import { InvalidArgumentError, InvalidOptionArgumentError } from 'commander'
import { getAddress, keccak256, toUtf8Bytes } from 'ethers'

import { isElementary } from '../converterClasses2Storage'
import { bytes32, commaSeparatedList, ethereumAddress } from './regEx'

const debug = require('debug')('sol2uml')

export const validateAddress = (address: string): string => {
    try {
        if (typeof address === 'string' && address?.match(ethereumAddress))
            return getAddress(address)
    } catch (err) {}

    throw new InvalidArgumentError(
        `Address must be in hexadecimal format with a 0x prefix.`,
    )
}

// Splits a comma-separated list of names.
export const validateNames = (variables: string): string[] => {
    try {
        if (
            typeof variables === 'string' &&
            variables.match(commaSeparatedList)
        )
            return variables.split(',')
    } catch (err) {}

    throw new InvalidArgumentError(
        `Must be a comma-separate list of names with no white spaces.`,
    )
}

export const validateLineBuffer = (lineBufferParam: string): number => {
    try {
        const lineBuffer = parseInt(lineBufferParam, 10)
        if (lineBuffer >= 0) return lineBuffer
    } catch (err) {}
    throw new InvalidOptionArgumentError(
        `Must be a zero or a positive integer.`,
    )
}

export const validateSlotNames = (
    slotNames: string,
): { name: string; offset: string }[] => {
    try {
        const slots = slotNames.split(',')
        const results = slots.map((slot) => {
            if (slot.match(bytes32)) {
                return {
                    name: undefined,
                    offset: slot,
                }
            }
            const offset = keccak256(toUtf8Bytes(slot))
            debug(`Slot name "${slot}" has hash "${offset}"`)
            return {
                name: slot,
                offset,
            }
        })
        console.log(results.length)
        return results
    } catch (err) {}
    throw new InvalidOptionArgumentError(
        `Must be a comma-separate list of slots with no white spaces.`,
    )
}

export const validateTypes = (typesString: string): string[] => {
    try {
        if (typeof typesString === 'string') {
            const types = typesString.split(',')
            types.forEach((type) => {
                if (!isElementary(type)) {
                    throw Error(`"${type}" is not an elementary type`)
                }
            })
            return types
        }
    } catch (err) {}

    throw new InvalidArgumentError(
        `Slot type must be an elementary type which includes dynamic and fixed size arrays. eg address, address[], uint256, int256[2], bytes32, string, bool`,
    )
}
