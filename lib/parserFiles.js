"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSolidityFile = exports.getSolidityFilesFromFolderOrFile = exports.getSolidityFilesFromFolderOrFiles = exports.parseUmlClassesFromFiles = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const klaw_1 = __importDefault(require("klaw"));
const parser_1 = require("@solidity-parser/parser");
const converterAST2Classes_1 = require("./converterAST2Classes");
const debug = require('debug')('sol2uml');
const parseUmlClassesFromFiles = async (filesOrFolders, ignoreFilesOrFolders, subfolders = -1) => {
    const files = await getSolidityFilesFromFolderOrFiles(filesOrFolders, ignoreFilesOrFolders, subfolders);
    let umlClasses = [];
    for (const file of files) {
        const node = await parseSolidityFile(file);
        const relativePath = (0, path_1.relative)(process.cwd(), file);
        const umlClass = (0, converterAST2Classes_1.convertAST2UmlClasses)(node, relativePath, [], true);
        umlClasses = umlClasses.concat(umlClass);
    }
    return umlClasses;
};
exports.parseUmlClassesFromFiles = parseUmlClassesFromFiles;
async function getSolidityFilesFromFolderOrFiles(folderOrFilePaths, ignoreFilesOrFolders, subfolders = -1) {
    let files = [];
    for (const folderOrFilePath of folderOrFilePaths) {
        const result = await getSolidityFilesFromFolderOrFile(folderOrFilePath, ignoreFilesOrFolders, subfolders);
        files = files.concat(result);
    }
    return files;
}
exports.getSolidityFilesFromFolderOrFiles = getSolidityFilesFromFolderOrFiles;
function getSolidityFilesFromFolderOrFile(folderOrFilePath, ignoreFilesOrFolders = [], depthLimit = -1) {
    debug(`About to get Solidity files under ${folderOrFilePath}`);
    return new Promise((resolve, reject) => {
        try {
            const folderOrFile = (0, fs_1.lstatSync)(folderOrFilePath);
            if (folderOrFile.isDirectory()) {
                const files = [];
                // filter out files or folders that are to be ignored
                const filter = (file) => {
                    return !ignoreFilesOrFolders.includes((0, path_1.basename)(file));
                };
                (0, klaw_1.default)(folderOrFilePath, {
                    depthLimit,
                    filter,
                    preserveSymlinks: true,
                })
                    .on('data', (file) => {
                    if (
                    // If file has sol extension
                    (0, path_1.extname)(file.path) === '.sol' &&
                        // and file and not a folder
                        // Note Foundry's forge outputs folders with the same name as the source file
                        file.stats.isFile())
                        files.push(file.path);
                })
                    .on('end', () => {
                    debug(`Got Solidity files to be parsed: ${files}`);
                    resolve(files);
                });
            }
            else if (folderOrFile.isFile()) {
                if ((0, path_1.extname)(folderOrFilePath) === '.sol') {
                    debug(`Got Solidity file to be parsed: ${folderOrFilePath}`);
                    resolve([folderOrFilePath]);
                }
                else {
                    reject(Error(`File ${folderOrFilePath} does not have a .sol extension.`));
                }
            }
            else {
                reject(Error(`Could not find directory or file ${folderOrFilePath}`));
            }
        }
        catch (err) {
            let error;
            if (err?.code === 'ENOENT') {
                error = Error(`No such file or folder ${folderOrFilePath}. Make sure you pass in the root directory of the contracts`);
            }
            else {
                error = new Error(`Failed to get Solidity files under folder or file ${folderOrFilePath}`, { cause: err });
            }
            console.error(error);
            reject(error);
        }
    });
}
exports.getSolidityFilesFromFolderOrFile = getSolidityFilesFromFolderOrFile;
function parseSolidityFile(fileName) {
    let solidityCode;
    try {
        solidityCode = (0, fs_1.readFileSync)(fileName, 'utf8');
    }
    catch (err) {
        throw new Error(`Failed to read solidity file ${fileName}.`, {
            cause: err,
        });
    }
    try {
        return (0, parser_1.parse)(solidityCode, {});
    }
    catch (err) {
        throw new Error(`Failed to parse solidity code in file ${fileName}.`, {
            cause: err,
        });
    }
}
exports.parseSolidityFile = parseSolidityFile;
//# sourceMappingURL=parserFiles.js.map