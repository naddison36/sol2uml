# Solidity 2 UML

[![npm version](https://badge.fury.io/js/sol2uml.svg)](https://badge.fury.io/js/sol2uml)

A visualisation tool for [Solidity](https://solidity.readthedocs.io/) contracts featuring:
1. [Unified Modeling Language (UML)](https://en.wikipedia.org/wiki/Unified_Modeling_Language) [class diagram](https://en.wikipedia.org/wiki/Class_diagram) generator for Solidity contracts.
2. Contract storage layout diagrams.

UML class diagram of Open Zeppelin's ERC20 token contracts generated from [version 2.5.1](https://github.com/OpenZeppelin/openzeppelin-solidity/tree/v2.5.1/contracts/token/ERC20)
![Open Zeppelin ERC20](./examples/OpenZeppelinERC20.svg)

See more contract diagrams [here](./examples/README.md).

Storage layout diagram of USDC's [verified source code](https://etherscan.io/address/0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf#code) on Etherscan.
![USDC](./examples/storage/usdcData.svg)

See more contract storage diagram examples [here](./examples/storage/README.md).

# Install

The following installation assumes [Node.js](https://nodejs.org/en/download/) has already been installed which comes with [Node Package Manager (NPM)](https://www.npmjs.com/).
`sol2uml` works with node 14 or above.

To install globally so you can run `sol2uml` from anywhere

```bash
npm link sol2uml --only=production
```

To upgrade run

```bash
npm upgrade sol2uml -g
```

To see which version you are using

```bash
npm ls sol2uml -g
```

# Usage

## Command Line Interface (CLI)

```
Usage: sol2uml [subcommand] <options>
The three subcommands:
* class:    Generates a UML class diagram from Solidity source code. default
* storage:  Generates a diagram of a contract's storage slots.
* flatten:  Merges verified source files from a Blockchain explorer into one local file.

The Solidity code can be pulled from verified source code on Blockchain explorers like Etherscan or from local Solidity files.

Options:
  -V, --version                                output the version number
  -sf, --subfolders <value>                    number of subfolders that will be recursively searched for Solidity files. (default: all)
  -f, --outputFormat <value>                   output file format. (choices: "svg", "png", "dot", "all", default: "svg")
  -o, --outputFileName <value>                 output file name
  -i, --ignoreFilesOrFolders <filesOrFolders>  comma separated list of files or folders to ignore
  -n, --network <network>                      Ethereum network (choices: "mainnet", "ropsten", "kovan", "rinkeby", "goerli", "sepolia", "polygon", "testnet.polygon", "arbitrum", "testnet.arbitrum", "avalanche", "testnet.avalanche", "bsc", "testnet.bsc", "crono", "fantom", "testnet.fantom", "moonbeam", "optimistic", "kovan-optimistic", default: "mainnet", env: ETH_NETWORK)
  -k, --apiKey <key>                           Blockchain explorer API key. eg Etherscan, Arbiscan, BscScan, CronoScan, FTMScan, PolygonScan or SnowTrace API key (env: SCAN_API_KEY)
  -v, --verbose                                run with debugging statements (default: false)
  -h, --help                                   display help for command

Commands:
  class [options] [fileFolderAddress]          Generates a UML class diagram from Solidity source code.
  storage [options] <fileFolderAddress>        output a contracts storage slots
  flatten <contractAddress>                    get all verified source code for a contract from the Blockchain explorer into one local file
  help [command]                               display help for command
```

### Class usage

```
Usage: sol2uml class <fileFolderAddress> [options]

Generates UML diagrams from Solidity source code.

If no file, folder or address is passed as the first argument, the working folder is used.
When a folder is used, all *.sol files are found in that folder and all sub folders.
A comma separated list of files and folders can also be used. For example
    sol2uml contracts,node_modules/openzeppelin-solidity

If an Ethereum address with a 0x prefix is passed, the verified source code from Etherscan will be used. For example
    sol2uml 0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9

Generates a UML class diagram from Solidity source code.

Arguments:
  fileFolderAddress                file name, base folder or contract address (default: "/Users/nicholasaddison/Documents/workspaces/sol2uml")

Options:
  -b, --baseContractNames <value>  only output contracts connected to these comma separated base contract names
  -d, --depth <value>              depth of connected classes to the base contracts. 1 will only show directly connected contracts, interfaces, libraries, structs and enums. (default: all)
  -c, --clusterFolders             cluster contracts into source folders (default: false)
  -hv, --hideVariables             hide variables from contracts, interfaces, structs and enums (default: false)
  -hf, --hideFunctions             hide functions from contracts, interfaces and libraries (default: false)
  -hp, --hidePrivates              hide private and internal attributes and operators (default: false)
  -he, --hideEnums                 hide enum types (default: false)
  -hs, --hideStructs               hide data structures (default: false)
  -hl, --hideLibraries             hide libraries (default: false)
  -hi, --hideInterfaces            hide interfaces (default: false)
  -ha, --hideAbstracts             hide abstract contracts (default: false)
  -hn, --hideFilename              hide relative path and file name (default: false)
  -h, --help                       display help for command
```

### Storage usage

```
Usage: sol2uml storage <fileFolderAddress> [options]

WARNING: sol2uml does not use the Solidity compiler so may differ with solc. A known example is fixed-sized arrays declared with an expression will fail to be sized.

Visually display a contract's storage slots.

Arguments:
  fileFolderAddress        file name, base folder or contract address

Options:
  -c, --contract <name>    Contract name in local Solidity files. Not needed when using an address as the first argument as the contract name can be derived from Etherscan.
  -d, --data               Gets the values in the storage slots from an Ethereum node. (default: false)
  -s, --storage <address>  The address of the contract with the storage values. This will be different from the contract with the code if a proxy contract is used. This is not needed if `fileFolderAddress` is an address and the contract is not proxied.
  -u, --url <url>          URL of the Ethereum node to get storage values if the `data` option is used. (default: "http://localhost:8545", env: NODE_URL)
  -bn, --block <number>    Block number to get the contract storage values from. (default: "latest")
  -h, --help               display help for command
```

### Flatten usage

```
Usage: sol2uml flatten <contractAddress> [options]

In order for the merged code to compile, the following is done:
1. File imports are commented out.
2. "SPDX-License-Identifier" is renamed to "SPDX--License-Identifier".
3. Contract dependencies are analysed so the files are merged in an order that will compile.

Merges verified source files for a contract from a Blockchain explorer into one local file.

Arguments:
  contractAddress  Contract address in hexadecimal format with a 0x prefix.

Options:
  -h, --help       display help for command
```

## UML Class diagram examples

To generate a diagram of all contracts under the contracts folder and its sub folders

```bash
sol2uml class ./contracts
```

To generate a diagram of EtherDelta's contract from the verified source code on [Etherscan](https://etherscan.io/address/0x8d12A197cB00D4747a1fe03395095ce2A5CC6819#code). The output wil be a svg file `0x8d12A197cB00D4747a1fe03395095ce2A5CC6819.svg` in the working folder.

```bash
sol2uml class 0x8d12A197cB00D4747a1fe03395095ce2A5CC6819
```

To generate a diagram of EtherDelta's contract from the verified source code on [Etherscan Ropsten](https://ropsten.etherscan.io/address/0xa19833bd291b66aB0E17b9C6d46D2Ec5fEC15190#code). The output wil be a svg file `0xa19833bd291b66aB0E17b9C6d46D2Ec5fEC15190.svg` in the working folder.

```bash
sol2uml class 0xa19833bd291b66aB0E17b9C6d46D2Ec5fEC15190 -n ropsten
```

To generate all Solidity files under some root folder and output the svg file to a specific location

```bash
sol2uml class path/to/contracts/root/folder -o ./outputFile.svg
```

To generate a diagram of all contracts in a single Solidity file, the output file in png format to output file `./someFile.png`

```bash
sol2uml class path/to/contracts/root/folder/solidity/file.sol -f png -o ./someFile.png
```

To generate a diagram of all Solidity files under the `contracts` and `node_modules/openzeppelin-solidity` folders. The output will be `contracts.svg` and `contracts.png` files in the working folder.

```bash
sol2uml class ./contracts,node_modules/openzeppelin-solidity -f all -v
```

To generate a diagram of all Solidity files under the working folder ignoring and files under the `solparse`, `@solidity-parser` and `ethlint` folders, which will be under the `node_modules` folder.

```bash
sol2uml class -i solparse,@solidity-parser,ethlint
```

# UML Class Diagram Syntax

Good online resources for learning UML

-   [UML 2 Class Diagramming Guidelines](http://www.agilemodeling.com/style/classDiagram.htm)
-   [Creating class diagrams with UML](https://www.ionos.com/digitalguide/websites/web-development/class-diagrams-with-uml/)

## Terminology differences

A Solidity variable becomes an attribute in UML and a Solidity function becomes an operation in UML.

## Stereotypes

### Class stereotypes

-   Interface
-   Abstract - if any of the contract's functions are abstract, the class will have an Abstract stereotype. Child contracts of abstract contracts that do not implement all the abstract functions are currently not marked as Abstract.
-   Library

### Operator stereotypes

-   event
-   modifier
-   abstract - if there is no function body on a contract, the operator is marked as abstract. Operators on an Interface do not have an abstract stereotype as all operators are abstract.
-   fallback - abstract fallback functions will just have an abstract stereotype.
-   payable - payable fallback functions will just have a fallback stereotype.

## UML Associations

Lines:

-   Solid lines for
    -   link the contract types of storage (state) variables. This can be linked to contracts, interfaces, libraries or file level structs and enums.
    -   generalisations of contracts and abstract contracts.
    -   aggregated contract level structs and enums.
-   Dashed lines for
    -   generalisations of interfaces.
    -   types of memory variables.

Heads/Tails:

-   An empty triangle head for generalisations of contracts, interfaces and abstract contracts.
-   An open arrow head for storage or memory variable dependencies
-   A diamond tail for aggregations of contract level structs and enums

## Storage diagram

![FileLevel-storage](./examples/storage/FileLevel-storage.png)

See more storage slot diagrams [here](./examples/storage/README.md).

# Version 2.x changes

The biggest change with 2.x is the introduction of subcommands as sol2uml can now draw contract storage diagrams.

See [version 2.x](./version2.md) for a list of changes from 1.x.

# Contribution

To build the test contracts in this repository, run the following. This assumes you have the [Solidity compiler](https://docs.soliditylang.org/en/v0.7.5/installing-solidity.html) `solc` installed on your machine.

`npm run buildSol`

To build the TypeScript files

`npm run build`

To run the Jest tests

`npm run test`

To access your local changes on your machine globally.

`npm link`

# About

This is a rewrite of the Richard Ramos's [solidity-diagram-gen](https://github.com/richard-ramos/solidity-diagram-gen) tool which no longer works as it uses [solidity-parser](https://www.npmjs.com/package/solidity-parser/v/0.4.0) which cannot handle newer Solidity syntax like `constructor`.

sol2uml uses [@solidity-parser/parser](https://github.com/solidity-parser/parser) which is maintained by the Solidity tool community lead by Franco Victorio (@fvictorio). This is a fork of Federico Bond's (GitHub @federicobond) [solidity-parser-antlr](https://github.com/federicobond/solidity-parser-antlr). The logic to generate the dot syntax has been rewritten and different UML syntax is now used to Richard Ramos's original implementation.

The [Solidity language grammar](https://solidity.readthedocs.io/en/develop/miscellaneous.html#language-grammar) is published with each major release.

The diagrams are generated using [viz.js](https://github.com/mdaines/viz.js/) which uses [Graphviz](http://www.graphviz.org/) to render a [Scalable Vector Graphics (SVG)](https://en.wikipedia.org/wiki/Scalable_Vector_Graphics) file. [Graphviz Online](https://dreampuf.github.io/GraphvizOnline/) allows dot files to be edited and rendered into a SVG dynamically.
