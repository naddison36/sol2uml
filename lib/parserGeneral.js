"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parserUmlClasses = void 0;
const parserEtherscan_1 = require("./parserEtherscan");
const parserFiles_1 = require("./parserFiles");
const regEx_1 = require("./utils/regEx");
const debug = require('debug')('sol2uml');
/**
 * Parses Solidity source code from a local filesystem or verified code on Etherscan
 * @param fileFolderAddress filename, folder name or contract address
 * @param options of type `ParserOptions`
 */
const parserUmlClasses = async (fileFolderAddress, options) => {
    let result = {
        umlClasses: [],
    };
    if ((0, regEx_1.isAddress)(fileFolderAddress)) {
        debug(`argument ${fileFolderAddress} is an Ethereum address so checking Etherscan for the verified source code`);
        const etherscanApiKey = options.apiKey || 'ZAD4UI2RCXCQTP38EXS3UY2MPHFU5H9KB1';
        const etherscanParser = new parserEtherscan_1.EtherscanParser(etherscanApiKey, options.network);
        result = await etherscanParser.getUmlClasses(fileFolderAddress);
    }
    else {
        const subfolders = parseInt(options.subfolders);
        if (isNaN(subfolders)) {
            console.error(`subfolders option must be an integer. Not ${options.subfolders}`);
            process.exit(1);
        }
        const filesFolders = fileFolderAddress.split(',');
        let ignoreFilesFolders = options.ignoreFilesOrFolders
            ? options.ignoreFilesOrFolders.split(',')
            : [];
        result.umlClasses = await (0, parserFiles_1.parseUmlClassesFromFiles)(filesFolders, ignoreFilesFolders, subfolders);
    }
    return result;
};
exports.parserUmlClasses = parserUmlClasses;
//# sourceMappingURL=parserGeneral.js.map