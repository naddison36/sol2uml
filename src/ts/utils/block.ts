import { JsonRpcProvider } from 'ethers'

const debug = require('debug')('sol2uml')

export const getBlock = async (options: {
    block: string
    url: string
    network: string
}): Promise<number> => {
    if (options.block === 'latest') {
        try {
            const provider = new JsonRpcProvider(options.url)
            const block = await provider.getBlockNumber()
            debug(
                `Latest block is ${block}. All storage slot values will be from this block.`,
            )
            return block
        } catch {
            const defaultMessage =
                options.url === 'http://localhost:8545'
                    ? 'This is the default url. Use the `-u, --url` option or `NODE_URL` environment variable to set the url of your blockchain node.'
                    : `Check your --url option or NODE_URL environment variable is pointing to the correct node for the "${options.network}" blockchain.`

            throw Error(
                `Failed to connect to blockchain node with url ${options.url}.\n${defaultMessage}`,
            )
        }
    }
    try {
        return parseInt(options.block)
    } catch {
        throw Error(`Invalid block number: ${options.block}`)
    }
}
