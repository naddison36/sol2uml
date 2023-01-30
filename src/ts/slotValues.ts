import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import axios from 'axios'
import { StorageSection } from './converterClasses2Storage'

const debug = require('debug')('sol2uml')

interface StorageAtResponse {
    jsonrpc: '2.0'
    id: string
    result: string
}

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
export const addSlotValues = async (
    url: string,
    contractAddress: string,
    storageSection: StorageSection,
    blockTag?: BigNumberish | 'latest'
) => {
    const valueVariables = storageSection.variables.filter(
        (variable) => variable.getValue || !variable.slotValue
    )
    if (valueVariables.length === 0) return

    const fromSlots = valueVariables.map((variable) => variable.fromSlot)
    // remove duplicate slot numbers
    const uniqueFromSlots = [...new Set(fromSlots)]

    // Convert slot numbers to BigNumbers and offset dynamic arrays
    let slotKeys = uniqueFromSlots.map((fromSlot) => {
        if (storageSection.offset) {
            return BigNumber.from(storageSection.offset).add(fromSlot)
        }
        return BigNumber.from(fromSlot)
    })

    // Get the contract slot values from the node provider
    const values = await getSlotValues(url, contractAddress, slotKeys, blockTag)

    // For each slot value retrieved
    values.forEach((value, i) => {
        // Get the corresponding slot number for the slot value
        const fromSlot = uniqueFromSlots[i]

        // For each variable in the storage section
        for (const variable of storageSection.variables) {
            if (variable.fromSlot === fromSlot) {
                variable.slotValue = value
            }
            // if variable is past the slot that has the value
            else if (variable.toSlot > fromSlot) {
                break
            }
        }
    })
}

let jsonRpcId = 0
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKeys array of 32 byte slot keys as BigNumbers.
 * @param blockTag block number or `latest`
 * @return slotValues array of 32 byte slot values as hexadecimal strings
 */
export const getSlotValues = async (
    url: string,
    contractAddress: string,
    slotKeys: BigNumberish[],
    blockTag: BigNumberish | 'latest' = 'latest'
): Promise<string[]> => {
    try {
        if (slotKeys.length === 0) {
            return []
        }
        debug(
            `About to get ${
                slotKeys.length
            } storage values for ${contractAddress} at block ${blockTag} starting at slot ${slotKeys[0].toString()}`
        )
        const block =
            blockTag === 'latest'
                ? blockTag
                : BigNumber.from(blockTag).toHexString()
        const payload = slotKeys.map((slot) => ({
            id: (jsonRpcId++).toString(),
            jsonrpc: '2.0',
            method: 'eth_getStorageAt',
            params: [
                contractAddress,
                BigNumber.from(slot).toHexString(),
                block,
            ],
        }))
        const response = await axios.post(url, payload)
        console.log(response.data)
        if (response.data?.error?.message) {
            throw new Error(response.data.error.message)
        }
        if (response.data.length !== slotKeys.length) {
            throw new Error(
                `Requested ${slotKeys.length} storage slot values but only got ${response.data.length}`
            )
        }
        const responseData = response.data as StorageAtResponse[]
        const sortedResponses = responseData.sort((a, b) =>
            BigNumber.from(a.id).gt(b.id) ? 1 : -1
        )
        return sortedResponses.map(
            (data) => '0x' + data.result.toUpperCase().slice(2)
        )
    } catch (err) {
        throw new Error(
            `Failed to get ${slotKeys.length} storage values for contract ${contractAddress} from ${url}`,
            { cause: err }
        )
    }
}

/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slotKey 32 byte slot key as a BigNumber.
 * @param blockTag block number or `latest`
 * @return slotValue 32 byte slot value as hexadecimal string
 */
export const getSlotValue = async (
    url: string,
    contractAddress: string,
    slotKey: BigNumberish,
    blockTag: BigNumberish | 'latest' = 'latest'
) => {
    debug(`About to get storage slot ${slotKey} value for ${contractAddress}`)

    const values = await getSlotValues(
        url,
        contractAddress,
        [slotKey],
        blockTag
    )

    debug(`Got slot ${slotKey} value: ${values[0]}`)
    return values[0]
}

export const dynamicSlotSize = (slotValue: string): number => {
    const sizeHex = '0x' + slotValue.slice(-2)
    return BigNumber.from(sizeHex).toNumber()
}
