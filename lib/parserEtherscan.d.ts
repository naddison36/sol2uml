import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { UmlClass } from './umlClass';
declare const networks: readonly ["mainnet", "ropsten", "kovan", "rinkeby", "goerli", "sepolia", "polygon", "bsc", "arbitrum", "optimistic", "snowtrace"];
declare type Network = typeof networks[number];
export declare class EtherscanParser {
    protected apikey: string;
    network: Network;
    readonly url: string;
    constructor(apikey?: string, network?: Network);
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
    getSolidityCode(contractAddress: string): Promise<{
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
     */
    getSourceCode(contractAddress: string): Promise<{
        files: {
            code: string;
            filename: string;
        }[];
        contractName: string;
    }>;
}
export {};
