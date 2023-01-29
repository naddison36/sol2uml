import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import axios from 'axios'

const debug = require('debug')('sol2uml')

interface StorageAtResponse {
    jsonrpc: '2.0'
    id: string
    result: string
}

let jsonRpcId = 0
/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slots array of slot numbers to retrieve values for.
 * @param blockTag block number or `latest`
 */
export const getStorageValues = async (
    url: string,
    contractAddress: string,
    slots: BigNumberish[],
    blockTag: BigNumberish | 'latest' = 'latest'
): Promise<string[]> => {
    try {
        if (slots.length === 0) {
            return []
        }
        debug(
            `About to get ${
                slots.length
            } storage values for ${contractAddress} at block ${blockTag} starting at slot ${slots[0].toString()}`
        )
        const block =
            blockTag === 'latest'
                ? blockTag
                : BigNumber.from(blockTag).toHexString()
        const payload = slots.map((slot) => ({
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
        if (response.data.length !== slots.length) {
            throw new Error(
                `Requested ${slots.length} storage slot values but only got ${response.data.length}`
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
            `Failed to get ${slots.length} storage values for contract ${contractAddress} from ${url}`,
            { cause: err }
        )
    }
}

/**
 * Get storage slot values from JSON-RPC API provider.
 * @param url of Ethereum JSON-RPC API provider. eg Infura or Alchemy
 * @param contractAddress Contract address to get the storage slot values from.
 * If proxied, use proxy and not the implementation contract.
 * @param slot slot number to retrieve the value for.
 * @param blockTag block number or `latest`
 */
export const getStorageValue = async (
    url: string,
    contractAddress: string,
    slot: BigNumberish,
    blockTag: BigNumberish | 'latest' = 'latest'
) => {
    debug(`About to get storage slot ${slot} value for ${contractAddress}`)

    const values = await getStorageValues(
        url,
        contractAddress,
        [slot],
        blockTag
    )

    debug(`Got slot ${slot} value: ${values[0]}`)
    return values[0]
}
