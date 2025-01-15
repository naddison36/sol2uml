import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { UmlClass } from './umlClass';
export interface Remapping {
    from: RegExp;
    to: string;
}
export declare const networks: readonly ["mainnet", "holesky", "sepolia", "polygon", "arbitrum", "avalanche", "bsc", "crono", "fantom", "moonbeam", "optimism", "gnosis", "celo", "scroll", "base", "sonic"];
export type Network = (typeof networks)[number];
export declare class EtherscanParser {
    protected apikey: string;
    network: Network;
    readonly url: string;
    constructor(apikey?: string, network?: Network, url?: string);
    /**
     * Parses the verified source code files from Etherscan
     * @param contractAddress Ethereum contract address with a 0x prefix
     * @return Promise with an array of UmlClass objects
     */
    getUmlClasses(contractAddress: string): Promise<{
        umlClasses: UmlClass[];
        contractName: string;
    }>;
    /**
     * Get Solidity code from Etherscan for a contract and merges all files
     * into one long string of Solidity code.
     * @param contractAddress Ethereum contract address with a 0x prefix
     * @return Promise string of Solidity code
     */
    getSolidityCode(contractAddress: string, filename?: string): Promise<{
        solidityCode: string;
        contractName: string;
    }>;
    /**
     * Parses Solidity source code into an ASTNode object
     * @param sourceCode Solidity source code
     * @return Promise with an ASTNode object from @solidity-parser/parser
     */
    parseSourceCode(sourceCode: string): Promise<ASTNode>;
    /**
     * Calls Etherscan to get the verified source code for the specified contract address
     * @param contractAddress Ethereum contract address with a 0x prefix
     * @oaram filename optional, case-sensitive name of the source file without the .sol
     */
    getSourceCode(contractAddress: string, filename?: string): Promise<{
        files: {
            code: string;
            filename: string;
        }[];
        contractName: string;
        compilerVersion: string;
        remappings: Remapping[];
    }>;
}
/**
 * Parses Ethersan's remappings config in its API response
 * @param rawMappings
 */
export declare const parseRemappings: (rawMappings: string[]) => Remapping[];
/**
 * Parses a single mapping. For example
 * "@openzeppelin/=lib/openzeppelin-contracts/"
 * This is from Uniswap's UniversalRouter in the Settings section after the source files
 * https://etherscan.io/address/0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B#code
 * @param mapping
 */
export declare const parseRemapping: (mapping: string) => Remapping;
