"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFolder = exports.isFile = exports.readFile = exports.parseUmlClassesFromFiles = void 0;
exports.getSolidityFilesFromFolderOrFiles = getSolidityFilesFromFolderOrFiles;
exports.getSolidityFilesFromFolderOrFile = getSolidityFilesFromFolderOrFile;
exports.parseSolidityFile = parseSolidityFile;
const fs_1 = require("fs");
const path_1 = require("path");
const klaw_1 = __importDefault(require("klaw"));
const parser_1 = require("@solidity-parser/parser");
const converterAST2Classes_1 = require("./converterAST2Classes");
const parserEtherscan_1 = require("./parserEtherscan");
const debug = require('debug')('sol2uml');
const parseFoundryTomlRemappings = (content) => {
    const match = content.match(/^remappings\s*=\s*\[([^\]]*)\]/ms);
    if (!match)
        return [];
    const remappings = [];
    for (const line of match[1].split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const stringMatch = trimmed.match(/^"([^"]+)"/);
        if (stringMatch) {
            try {
                remappings.push((0, parserEtherscan_1.parseRemapping)(stringMatch[1]));
            }
            catch {
                // skip invalid remapping entries
            }
        }
    }
    return remappings;
};
const findFoundryTomlRemappings = (startPath) => {
    let dir;
    try {
        dir = (0, fs_1.lstatSync)(startPath).isDirectory()
            ? (0, path_1.resolve)(startPath)
            : (0, path_1.dirname)((0, path_1.resolve)(startPath));
    }
    catch {
        dir = (0, path_1.resolve)(startPath);
    }
    while (true) {
        const foundryTomlPath = (0, path_1.join)(dir, 'foundry.toml');
        try {
            const content = (0, fs_1.readFileSync)(foundryTomlPath, 'utf8');
            const remappings = parseFoundryTomlRemappings(content);
            if (remappings.length > 0) {
                debug(`Found ${remappings.length} Foundry remappings in ${foundryTomlPath}`);
                return { remappings, base: dir };
            }
        }
        catch {
            // file not found, search parent
        }
        const parent = (0, path_1.dirname)(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
};
const parseUmlClassesFromFiles = async (filesOrFolders, ignoreFilesOrFolders, subfolders = -1) => {
    const files = await getSolidityFilesFromFolderOrFiles(filesOrFolders, ignoreFilesOrFolders, subfolders);
    // Auto-detect Foundry remappings to resolve non-npm imports (e.g. soldeer dependencies)
    let remappings = [];
    let remappingsBase;
    const foundryResult = findFoundryTomlRemappings(filesOrFolders[0] || process.cwd());
    if (foundryResult) {
        remappings = foundryResult.remappings;
        remappingsBase = foundryResult.base;
    }
    let umlClasses = [];
    for (const file of files) {
        const node = await parseSolidityFile(file);
        const relativePath = (0, path_1.relative)(process.cwd(), file);
        const newUmlClasses = (0, converterAST2Classes_1.convertAST2UmlClasses)(node, relativePath, remappings, true, remappingsBase);
        umlClasses = umlClasses.concat(newUmlClasses);
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
                    // debug(`Got Solidity files to be parsed: ${files}`)
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
function parseSolidityFile(fileName) {
    const solidityCode = (0, exports.readFile)(fileName);
    try {
        return (0, parser_1.parse)(solidityCode, {});
    }
    catch (err) {
        throw new Error(`Failed to parse solidity code in file ${fileName}.`, {
            cause: err,
        });
    }
}
const readFile = (fileName, extension) => {
    try {
        // try to read file with no extension
        return (0, fs_1.readFileSync)(fileName, 'utf8');
    }
    catch (err) {
        if (!extension) {
            throw new Error(`Failed to read file "${fileName}".`, {
                cause: err,
            });
        }
        try {
            // try to read file with extension
            return (0, fs_1.readFileSync)(`${fileName}.${extension}`, 'utf8');
        }
        catch (err) {
            throw new Error(`Failed to read file "${fileName}" or "${fileName}.${extension}".`, {
                cause: err,
            });
        }
    }
};
exports.readFile = readFile;
const isFile = (fileName) => {
    try {
        const file = (0, fs_1.lstatSync)(fileName);
        return file.isFile();
    }
    catch {
        return false;
    }
};
exports.isFile = isFile;
const isFolder = (fileName) => {
    try {
        const file = (0, fs_1.lstatSync)(fileName);
        return file.isDirectory();
    }
    catch {
        return false;
    }
};
exports.isFolder = isFolder;
//# sourceMappingURL=parserFiles.js.map