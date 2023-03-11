#! /usr/bin/env node

import { convertUmlClasses2Dot } from './converterClasses2Dot'
import { parserUmlClasses } from './parserGeneral'
import { EtherscanParser, networks } from './parserEtherscan'
import {
    classesConnectedToBaseContracts,
    filterHiddenClasses,
} from './filterClasses'
import { Command, Option } from 'commander'
import {
    addDynamicVariables,
    convertClasses2StorageSections,
} from './converterClasses2Storage'
import { convertStorages2Dot } from './converterStorage2Dot'
import { isAddress } from './utils/regEx'
import { writeOutputFiles, writeSolidity } from './writerFiles'
import { basename } from 'path'
import { squashUmlClasses } from './squashClasses'
import { diffCode } from './diff'
import { addSlotValues } from './slotValues'
import { ethers } from 'ethers'

const clc = require('cli-color')
const program = new Command()

const debugControl = require('debug')
const debug = require('debug')('sol2uml')

program
    .usage('[command] <options>')
    .description(
        `Generate UML class or storage diagrams from local Solidity code or verified Solidity code on Etherscan-like explorers.
Can also flatten or compare verified source files on Etherscan-like explorers.`
    )
    .addOption(
        new Option(
            '-sf, --subfolders <value>',
            'number of subfolders that will be recursively searched for Solidity files.'
        ).default('-1', 'all')
    )
    .addOption(
        new Option('-f, --outputFormat <value>', 'output file format.')
            .choices(['svg', 'png', 'dot', 'all'])
            .default('svg')
    )
    .option('-o, --outputFileName <value>', 'output file name')
    .option(
        '-i, --ignoreFilesOrFolders <filesOrFolders>',
        'comma separated list of files or folders to ignore'
    )
    .addOption(
        new Option('-n, --network <network>', 'Ethereum network')
            .choices(networks)
            .default('mainnet')
            .env('ETH_NETWORK')
    )
    .addOption(
        new Option(
            '-k, --apiKey <key>',
            'Blockchain explorer API key. eg Etherscan, Arbiscan, Optimism, BscScan, CronoScan, FTMScan, PolygonScan or SnowTrace API key'
        ).env('SCAN_API_KEY')
    )
    .option(
        '-bc, --backColor <color>',
        'Canvas background color. "none" will use a transparent canvas.',
        'white'
    )
    .option(
        '-sc, --shapeColor <color>',
        'Basic drawing color for graphics, not text',
        'black'
    )
    .option(
        '-fc, --fillColor <color>',
        'Color used to fill the background of a node',
        'gray95'
    )
    .option('-tc, --textColor <color>', 'Color used for text', 'black')
    .option('-v, --verbose', 'run with debugging statements', false)

const version =
    basename(__dirname) === 'lib'
        ? require('../package.json').version // used when run from compile js in /lib
        : require('../../package.json').version // used when run from TypeScript source files under src/ts via ts-node
program.version(version)

const argumentText = `file name, folder(s) or contract address.
\t\t\t\t  When a folder is used, all *.sol files in that folder and all sub folders are used.
\t\t\t\t  A comma-separated list of files and folders can also be used. For example
\t\t\t\t\tsol2uml contracts,node_modules/openzeppelin-solidity
\t\t\t\t  If an Ethereum address with a 0x prefix is passed, the verified source code from Etherscan will be used. For example
\t\t\t\t\tsol2uml 0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9`
program
    .command('class', { isDefault: true })
    .usage('[options] <fileFolderAddress>')
    .description('Generates a UML class diagram from Solidity source code.')
    .argument('fileFolderAddress', argumentText)
    .option(
        '-b, --baseContractNames <value>',
        'only output contracts connected to these comma separated base contract names'
    )
    .addOption(
        new Option(
            '-d, --depth <value>',
            'depth of connected classes to the base contracts. 1 will only show directly connected contracts, interfaces, libraries, structs and enums.'
        ).default('100', 'all')
    )
    .option(
        '-c, --clusterFolders',
        'cluster contracts into source folders',
        false
    )
    .option(
        '-hv, --hideVariables',
        'hide variables from contracts, interfaces, structs and enums',
        false
    )
    .option(
        '-hf, --hideFunctions',
        'hide functions from contracts, interfaces and libraries',
        false
    )
    .option(
        '-hp, --hidePrivates',
        'hide private and internal attributes and operators',
        false
    )
    .option(
        '-hm, --hideModifiers',
        'hide modifier functions from contracts',
        false
    )
    .option(
        '-ht, --hideEvents',
        'hide events from contracts, interfaces and libraries',
        false
    )
    .option('-hc, --hideConstants', 'hide file level constants', false)
    .option('-hx, --hideContracts', 'hide contracts', false)
    .option('-he, --hideEnums', 'hide enum types', false)
    .option('-hs, --hideStructs', 'hide data structures', false)
    .option('-hl, --hideLibraries', 'hide libraries', false)
    .option('-hi, --hideInterfaces', 'hide interfaces', false)
    .option('-ha, --hideAbstracts', 'hide abstract contracts', false)
    .option('-hn, --hideFilename', 'hide relative path and file name', false)
    .option(
        '-s, --squash',
        'squash inherited contracts to the base contract(s)',
        false
    )
    .option(
        '-hsc, --hideSourceContract',
        'hide the source contract when using squash',
        false
    )
    .action(async (fileFolderAddress, options, command) => {
        try {
            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            // Parse Solidity code from local file system or verified source code on Etherscan.
            let { umlClasses, contractName } = await parserUmlClasses(
                fileFolderAddress,
                combinedOptions
            )

            if (
                options.squash &&
                // Must specify base contract(s) or parse from Etherscan to get contractName
                !options.baseContractNames &&
                !contractName
            ) {
                throw Error(
                    'Must specify base contract(s) when using the squash option against local Solidity files.'
                )
            }
            if (options.squash && options.hideContracts) {
                throw Error('Can not hide contracts when squashing contracts.')
            }

            const baseContractNames = options.baseContractNames?.split(',')
            if (baseContractNames) {
                contractName = baseContractNames[0]
            }

            // Filter out any class stereotypes that are to be hidden
            let filteredUmlClasses = filterHiddenClasses(umlClasses, options)

            // squash contracts
            if (options.squash) {
                filteredUmlClasses = squashUmlClasses(
                    filteredUmlClasses,
                    baseContractNames || [contractName]
                )
            }

            if (baseContractNames || options.squash) {
                // Find all the classes connected to the base classes after they have been squashed
                filteredUmlClasses = classesConnectedToBaseContracts(
                    filteredUmlClasses,
                    baseContractNames || [contractName],
                    options.depth
                )
            }

            // Convert UML classes to Graphviz dot format.
            const dotString = convertUmlClasses2Dot(
                filteredUmlClasses,
                combinedOptions.clusterFolders,
                combinedOptions
            )

            // Convert Graphviz dot format to file formats. eg svg or png
            await writeOutputFiles(
                dotString,
                contractName || 'classDiagram',
                combinedOptions.outputFormat,
                combinedOptions.outputFileName
            )

            debug(`Finished generating UML`)
        } catch (err) {
            console.error(err)
            process.exit(2)
        }
    })

program
    .command('storage')
    .usage('[options] <fileFolderAddress>')
    .description(
        `Visually display a contract's storage slots.

WARNING: sol2uml does not use the Solidity compiler so may differ with solc. A known example is fixed-sized arrays declared with an expression will fail to be sized.\n`
    )
    .argument('fileFolderAddress', argumentText)
    .option(
        '-c, --contract <name>',
        'Contract name in the local Solidity files. Not needed when using an address as the first argument as the contract name can be derived from Etherscan.'
    )
    .option(
        '-cf, --contractFile <filename>',
        'Filename the contract is located in. This can include the relative path to the desired file.'
    )
    .option(
        '-d, --data',
        'Gets the values in the storage slots from an Ethereum node.',
        false
    )
    .option(
        '-s, --storage <address>',
        'The address of the contract with the storage values. This will be different from the contract with the code if a proxy contract is used. This is not needed if `fileFolderAddress` is an address and the contract is not proxied.'
    )
    .addOption(
        new Option(
            '-u, --url <url>',
            'URL of the Ethereum node to get storage values if the `data` option is used.'
        )
            .env('NODE_URL')
            .default('http://localhost:8545')
    )
    .option(
        '-bn, --block <number>',
        'Block number to get the contract storage values from.',
        'latest'
    )
    .option(
        '-a, --array <number>',
        'Number of slots to display at the start and end of arrays.',
        '2'
    )
    .option('-hv, --hideValue', 'Hide storage slot value column.', false)
    .action(async (fileFolderAddress, options, command) => {
        try {
            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            // If not an address and the contractName option has not been specified
            if (!isAddress(fileFolderAddress) && !combinedOptions.contract) {
                throw Error(
                    `Must use the \`-c, --contract <name>\` option to specify the contract to draw the storage diagram for when sourcing from local files.\nThis option is not needed when sourcing from a blockchain explorer with a contract address.`
                )
            }

            let { umlClasses, contractName } = await parserUmlClasses(
                fileFolderAddress,
                combinedOptions
            )

            contractName = combinedOptions.contract || contractName
            const arrayItems = parseInt(combinedOptions.array)
            const storageSections = convertClasses2StorageSections(
                contractName,
                umlClasses,
                arrayItems,
                combinedOptions.contractFile
            )

            if (isAddress(fileFolderAddress)) {
                // The first storage is the contract
                storageSections[0].address = fileFolderAddress
            }

            if (combinedOptions.data) {
                let storageAddress = combinedOptions.storage
                if (storageAddress) {
                    if (!isAddress(storageAddress)) {
                        throw Error(
                            `Invalid address to get storage data from "${storageAddress}"`
                        )
                    }
                } else {
                    if (!isAddress(fileFolderAddress)) {
                        throw Error(
                            `Can not get storage slot values if first param is not an address and the \`--storage\` option is not used.`
                        )
                    }
                    storageAddress = fileFolderAddress
                }

                let block = combinedOptions.block
                if (block === 'latest') {
                    const provider = new ethers.providers.JsonRpcProvider(
                        combinedOptions.url
                    )
                    block = await provider.getBlockNumber()
                    debug(
                        `Latest block is ${block}. All storage slot values will be from this block.`
                    )
                }

                // Get slot values for each storage section
                for (const storageSection of storageSections) {
                    await addSlotValues(
                        combinedOptions.url,
                        storageAddress,
                        storageSection,
                        arrayItems,
                        block
                    )
                    // Add storage variables for dynamic arrays, strings and bytes
                    await addDynamicVariables(
                        storageSection,
                        storageSections,
                        combinedOptions.url,
                        storageAddress,
                        arrayItems,
                        block
                    )
                }
            }

            const dotString = convertStorages2Dot(
                storageSections,
                combinedOptions
            )

            await writeOutputFiles(
                dotString,
                contractName || 'storageDiagram',
                combinedOptions.outputFormat,
                combinedOptions.outputFileName
            )
        } catch (err) {
            console.error(err)
            process.exit(2)
        }
    })

program
    .command('flatten')
    .usage('<contractAddress>')
    .description(
        `Merges verified source files for a contract from a Blockchain explorer into one local Solidity file.

In order for the merged code to compile, the following is done:
1. pragma solidity is set using the compiler of the verified contract.
2. All pragma solidity lines in the source files are commented out.
3. File imports are commented out.
4. "SPDX-License-Identifier" is renamed to "SPDX--License-Identifier".
5. Contract dependencies are analysed so the files are merged in an order that will compile.\n`
    )
    .argument(
        '<contractAddress>',
        'Contract address in hexadecimal format with a 0x prefix.'
    )
    .action(async (contractAddress, options, command) => {
        try {
            debug(`About to flatten ${contractAddress}`)

            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            const etherscanParser = new EtherscanParser(
                combinedOptions.apiKey,
                combinedOptions.network
            )

            const { solidityCode, contractName } =
                await etherscanParser.getSolidityCode(contractAddress)

            // Write Solidity to the contract address
            const outputFilename =
                combinedOptions.outputFileName || contractName
            await writeSolidity(solidityCode, outputFilename)
        } catch (err) {
            console.error(err)
            process.exit(2)
        }
    })

program
    .command('diff')
    .usage('[options] <addressA> <addressB>')
    .description(
        `Compare verified Solidity code differences between two contracts.

The results show the comparison of contract A to B.
The ${clc.green(
            'green'
        )} sections are additions to contract B that are not in contract A.
The ${clc.red(
            'red'
        )} sections are removals from contract A that are not in contract B.
The line numbers are from contract B. There are no line numbers for the red sections as they are not in contract B.\n`
    )
    .argument(
        '<addressA>',
        'Contract address in hexadecimal format with a 0x prefix of the first contract.'
    )
    .argument(
        '<addressB>',
        'Contract address in hexadecimal format with a 0x prefix of the second contract.'
    )
    .addOption(
        new Option(
            '-l, --lineBuffer <value>',
            'Minimum number of lines before and after changes'
        ).default('4')
    )
    .option(
        '-s, --saveFiles',
        'Save the flattened contract code to the filesystem. The file names will be the contract address with a .sol extension.',
        false
    )
    .action(async (addressA, addressB, options, command) => {
        try {
            debug(`About to diff ${addressA} and ${addressB}`)

            const combinedOptions = {
                ...command.parent._optionValues,
                ...options,
            }

            // Diff solidity code
            const lineBuffer = parseInt(options.lineBuffer)
            if (isNaN(lineBuffer))
                throw Error(
                    `Invalid line buffer "${options.lineBuffer}". Must be a number`
                )

            const etherscanParser = new EtherscanParser(
                combinedOptions.apiKey,
                combinedOptions.network
            )

            // Get verified Solidity code from Etherscan and flatten
            const { solidityCode: codeA, contractName: contractNameA } =
                await etherscanParser.getSolidityCode(addressA)
            const { solidityCode: codeB, contractName: contractNameB } =
                await etherscanParser.getSolidityCode(addressB)

            console.log(`Difference between`)
            console.log(
                `A. ${addressA} ${contractNameA} on ${combinedOptions.network}`
            )
            console.log(
                `B. ${addressB} ${contractNameB} on ${combinedOptions.network}\n`
            )

            diffCode(codeA, codeB, lineBuffer)

            if (options.saveFiles) {
                await writeSolidity(codeA, addressA)
                await writeSolidity(codeB, addressB)
            }
        } catch (err) {
            console.error(err)
            process.exit(2)
        }
    })

program.on('option:verbose', () => {
    debugControl.enable('sol2uml,axios')
    debug('verbose on')
})

const main = async () => {
    await program.parseAsync(process.argv)
}
main()
