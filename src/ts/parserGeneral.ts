import { EtherscanParser, Network } from './parserEtherscan'
import { parseUmlClassesFromFiles } from './parserFiles'
import { UmlClass } from './umlClass'
import { isAddress } from './utils/regEx'

const debug = require('debug')('sol2uml')

export interface ParserOptions {
    apiKey?: string
    network?: Network
    explorerUrl?: string
    subfolders?: string
    ignoreFilesOrFolders?: string[]
}

/**
 * Parses Solidity source code from a local filesystem or verified code on Etherscan
 * @param fileFolderAddress filename, folder name or contract address
 * @param options of type `ParserOptions`
 */
export const parserUmlClasses = async (
    fileFolderAddress: string,
    options: ParserOptions,
): Promise<{
    umlClasses: UmlClass[]
    contractName?: string
}> => {
    let result: {
        umlClasses: UmlClass[]
        contractName?: string
    } = {
        umlClasses: [],
    }
    if (isAddress(fileFolderAddress)) {
        debug(
            `argument ${fileFolderAddress} is an Ethereum address so checking Etherscan for the verified source code`,
        )

        const etherscanApiKey = options.apiKey
        const etherscanParser = new EtherscanParser(
            etherscanApiKey,
            options.network,
            options.explorerUrl,
        )

        result = await etherscanParser.getUmlClasses(fileFolderAddress)
    } else {
        const subfolders = parseInt(options.subfolders)
        if (isNaN(subfolders)) {
            console.error(
                `subfolders option must be an integer. Not ${options.subfolders}`,
            )
            process.exit(1)
        }

        const filesFolders: string[] = fileFolderAddress.split(',')
        result.umlClasses = await parseUmlClassesFromFiles(
            filesFolders,
            options.ignoreFilesOrFolders || [],
            subfolders,
        )
    }
    return result
}
