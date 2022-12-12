import { Network } from './parserEtherscan';
import { UmlClass } from './umlClass';
export interface ParserOptions {
    apiKey?: string;
    network?: Network;
    subfolders?: string;
    ignoreFilesOrFolders?: string;
}
/**
 * Parses Solidity source code from a local filesystem or verified code on Etherscan
 * @param fileFolderAddress filename, folder name or contract address
 * @param options of type `ParserOptions`
 */
export declare const parserUmlClasses: (fileFolderAddress: string, options: ParserOptions) => Promise<{
    umlClasses: UmlClass[];
    contractName?: string;
}>;
