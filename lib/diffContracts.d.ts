import { EtherscanParser } from './parserEtherscan';
interface DiffOptions {
    network: string;
    bNetwork?: string;
    lineBuffer: number;
    summary?: boolean;
    aFile?: string;
    bFile?: string;
    saveFiles?: boolean;
}
interface DiffFiles {
    filename?: string;
    aCode?: string;
    bCode?: string;
    result: 'added' | 'removed' | 'match' | 'changed';
}
interface CompareContracts {
    files: DiffFiles[];
    contractNameA: string;
    contractNameB?: string;
    local?: 'file' | 'folders';
}
export declare const compareVerifiedContracts: (addressA: string, aEtherscanParser: EtherscanParser, addressB: string, bEtherscanParser: EtherscanParser, options: DiffOptions) => Promise<void>;
export declare const compareVerified2Local: (addressA: string, aEtherscanParser: EtherscanParser, fileOrBaseFolders: string[], options: DiffOptions) => Promise<void>;
export declare const compareFlattenContracts: (addressA: string, addressB: string, aEtherscanParser: EtherscanParser, bEtherscanParser: EtherscanParser, options: DiffOptions) => Promise<{
    contractNameA: string;
    contractNameB: string;
}>;
export declare const diffVerified2Local: (addressA: string, etherscanParserA: EtherscanParser, fileOrBaseFolders: string[], ignoreFilesOrFolders?: string[]) => Promise<CompareContracts>;
export declare const diffVerifiedContracts: (addressA: string, addressB: string, etherscanParserA: EtherscanParser, etherscanParserB: EtherscanParser, _options: DiffOptions) => Promise<CompareContracts>;
export declare const displayFileDiffSummary: (fileDiffs: DiffFiles[]) => void;
export declare const displayFileDiffs: (fileDiffs: DiffFiles[], options?: {
    lineBuffer?: number;
    aFile?: string;
}) => void;
export {};
