"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayFileDiffs = exports.displayFileDiffSummary = exports.diffVerifiedContracts = exports.diffVerified2Local = exports.compareFlattenContracts = exports.compareVerified2Local = exports.compareVerifiedContracts = void 0;
const clc = require('cli-color');
const fs_1 = require("fs");
const path_1 = require("path");
const parserFiles_1 = require("./parserFiles");
const writerFiles_1 = require("./writerFiles");
const regEx_1 = require("./utils/regEx");
const diff_1 = require("./utils/diff");
const debug = require('debug')('sol2uml');
const compareVerifiedContracts = async (addressA, aEtherscanParser, addressB, bEtherscanParser, options) => {
    const { contractNameA, contractNameB, files } = await (0, exports.diffVerifiedContracts)(addressA, addressB, aEtherscanParser, bEtherscanParser, options);
    if (!options.summary) {
        (0, exports.displayFileDiffs)(files, options);
    }
    const aFileDesc = options.aFile ? `"${options.aFile}" file for the ` : '';
    const bFileDesc = options.aFile
        ? `"${options.bFile || options.aFile}" file for the `
        : '';
    console.log(`Compared the ${aFileDesc}"${contractNameA}" contract with address ${addressA} on ${options.network}`);
    console.log(`to the ${bFileDesc}"${contractNameB}" contract with address ${addressB} on ${options.bNetwork || options.network}\n`);
    (0, exports.displayFileDiffSummary)(files);
};
exports.compareVerifiedContracts = compareVerifiedContracts;
const compareVerified2Local = async (addressA, aEtherscanParser, fileOrBaseFolders, options) => {
    // compare verified contract to local files
    const { contractNameA, files, local } = await (0, exports.diffVerified2Local)(addressA, aEtherscanParser, fileOrBaseFolders);
    if (!options.summary) {
        (0, exports.displayFileDiffs)(files, options);
    }
    const aFileDesc = options.aFile ? `"${options.aFile}" file with the ` : '';
    console.log(`Compared the ${aFileDesc}"${contractNameA}" contract with address ${addressA} on ${options.network}`);
    if (local) {
        console.log(`to local file "${fileOrBaseFolders}"\n`);
    }
    else {
        console.log(`to local files under folders "${fileOrBaseFolders}"\n`);
    }
    (0, exports.displayFileDiffSummary)(files);
};
exports.compareVerified2Local = compareVerified2Local;
const compareFlattenContracts = async (addressA, addressB, aEtherscanParser, bEtherscanParser, options) => {
    // Get verified Solidity code from Etherscan and flatten
    const { solidityCode: codeA, contractName: contractNameA } = await aEtherscanParser.getSolidityCode(addressA, options.aFile);
    const { solidityCode: codeB, contractName: contractNameB } = await bEtherscanParser.getSolidityCode(addressB, options.bFile || options.aFile);
    (0, diff_1.diffCode)(codeA, codeB, options.lineBuffer);
    if (options.saveFiles) {
        await (0, writerFiles_1.writeSourceCode)(codeA, addressA);
        await (0, writerFiles_1.writeSourceCode)(codeB, addressB);
    }
    if (options.bFile || options.aFile) {
        console.log(`Compared the "${options.aFile}" file with the "${contractNameA}" contract with address ${addressA} on ${options.network}`);
        console.log(`to the "${options.bFile || options.aFile}" file for the "${contractNameB}" contract with address ${addressB} on ${options.bNetwork || options.network}\n`);
    }
    else {
        console.log(`Compared the flattened "${contractNameA}" contract with address ${addressA} on ${options.network}`);
        console.log(`to the flattened "${contractNameB}" contract with address ${addressB} on ${options.bNetwork || options.network}\n`);
    }
    return { contractNameA, contractNameB };
};
exports.compareFlattenContracts = compareFlattenContracts;
const diffVerified2Local = async (addressA, etherscanParserA, fileOrBaseFolders, ignoreFilesOrFolders = []) => {
    const files = [];
    // Get all the source files for the verified contract from Etherscan
    const { files: aFiles, contractName: contractNameA } = await etherscanParserA.getSourceCode(addressA);
    if (aFiles.length === 1 && (0, regEx_1.isAddress)(aFiles[0].filename)) {
        // The verified contract is a single, flat file
        const aFile = aFiles[0];
        const bFile = fileOrBaseFolders[0];
        if ((0, parserFiles_1.isFolder)(bFile)) {
            throw Error(`Contract with address ${addressA} is a single, flat file so cannot be compared to a local files under folder(s) "${fileOrBaseFolders.toString()}".`);
        }
        // Try and read the bFile
        const bCode = (0, parserFiles_1.readFile)(bFile, 'sol');
        files.push({
            filename: aFile.filename,
            aCode: aFile.code,
            bCode,
            result: aFile.code === bCode ? 'match' : 'changed',
        });
        return {
            files,
            contractNameA,
            local: 'file',
        };
    }
    const bFiles = await (0, parserFiles_1.getSolidityFilesFromFolderOrFiles)(fileOrBaseFolders, ignoreFilesOrFolders);
    // For each file in the A contract
    for (const aFile of aFiles) {
        // Look for A contract filename in local filesystem
        let bFile;
        // for each of the base folders
        for (const baseFolder of fileOrBaseFolders) {
            const aFileResolvedPath = (0, path_1.resolve)(process.cwd(), baseFolder, aFile.filename);
            try {
                // Resolve full path including symlinks. For example,
                // node_modules/@openzeppelin/contracts is a symlink to
                // node_modules/.pnpm/@openzeppelin+contracts@x.y.z/node_modules/@openzeppelin/contracts
                const aFileRealPath = (0, fs_1.realpathSync)(aFileResolvedPath);
                bFile = bFiles.find((bFile) => bFile === aFileRealPath);
                if (bFile) {
                    // Found match of aFile in bFiles, break out of loop to try next aFile
                    break;
                }
            }
            catch {
                // Do nothing, continue to next bFile in loop
            }
        }
        if (bFile) {
            debug(`Matched verified file ${aFile.filename} to local file ${bFile}`);
            // Try and read code from bFile
            const bCode = (0, parserFiles_1.readFile)(bFile);
            // The A contract filename exists in the B contract
            if (aFile.code !== bCode) {
                // console.log(`${aFile.filename}  ${clc.red('different')}:`)
                files.push({
                    filename: aFile.filename,
                    aCode: aFile.code,
                    bCode,
                    result: 'changed',
                });
            }
            else {
                files.push({
                    filename: aFile.filename,
                    aCode: aFile.code,
                    bCode,
                    result: 'match',
                });
            }
        }
        else {
            debug(`Failed to find local file for verified files ${aFile.filename}`);
            // The A contract filename does not exist in the B contract
            files.push({
                filename: aFile.filename,
                aCode: aFile.code,
                result: 'removed',
            });
        }
    }
    // Sort by filename
    return {
        files: files.sort((a, b) => a.filename.localeCompare(b.filename)),
        contractNameA,
    };
};
exports.diffVerified2Local = diffVerified2Local;
const diffVerifiedContracts = async (addressA, addressB, etherscanParserA, etherscanParserB, options) => {
    const files = [];
    const { files: aFiles, contractName: contractNameA } = await etherscanParserA.getSourceCode(addressA);
    const { files: bFiles, contractName: contractNameB } = await etherscanParserB.getSourceCode(addressB);
    if (aFiles.length === 1 && bFiles.length === 1) {
        if ((0, regEx_1.isAddress)(aFiles[0].filename))
            files.push({
                filename: `${aFiles[0].filename} to ${bFiles[0].filename}`,
                aCode: aFiles[0].code,
                bCode: bFiles[0].code,
                result: aFiles[0].code === bFiles[0].code ? 'match' : 'changed',
            });
        return {
            files,
            contractNameA,
            contractNameB,
        };
    }
    // For each file in the A contract
    for (const aFile of aFiles) {
        // Look for A contract filename in B contract
        const bFile = bFiles.find((bFile) => bFile.filename === aFile.filename);
        if (bFile) {
            // The A contract filename exists in the B contract
            if (aFile.code !== bFile.code) {
                // console.log(`${aFile.filename}  ${clc.red('different')}:`)
                files.push({
                    filename: aFile.filename,
                    aCode: aFile.code,
                    bCode: bFile.code,
                    result: 'changed',
                });
            }
            else {
                files.push({
                    filename: aFile.filename,
                    aCode: aFile.code,
                    bCode: bFile.code,
                    result: 'match',
                });
            }
        }
        else {
            // The A contract filename does not exist in the B contract
            files.push({
                filename: aFile.filename,
                aCode: aFile.code,
                result: 'removed',
            });
        }
    }
    // For each file in the B contract
    for (const bFile of bFiles) {
        // Look for B contract filename in A contract
        const aFile = aFiles.find((aFile) => aFile.filename === bFile.filename);
        if (!aFile) {
            // The B contract filename does not exist in the A contract
            files.push({
                filename: bFile.filename,
                bCode: bFile.code,
                result: 'added',
            });
        }
    }
    // Sort by filename
    return {
        files: files.sort((a, b) => a.filename.localeCompare(b.filename)),
        contractNameA,
        contractNameB,
    };
};
exports.diffVerifiedContracts = diffVerifiedContracts;
const displayFileDiffSummary = (fileDiffs) => {
    for (const file of fileDiffs) {
        switch (file.result) {
            case 'match':
                console.log(`${file.result.padEnd(7)} ${file.filename}`);
                break;
            case 'added':
                console.log(`${clc.green(file.result.padEnd(7))} ${file.filename}`);
                break;
            case 'changed':
            case 'removed':
                console.log(`${clc.red(file.result)} ${file.filename}`);
                break;
        }
    }
};
exports.displayFileDiffSummary = displayFileDiffSummary;
const displayFileDiffs = (fileDiffs, options = {}) => {
    let aFileFound = false;
    for (const file of fileDiffs) {
        if (options.aFile) {
            if (file.filename !== options.aFile)
                continue;
            else
                aFileFound = true;
        }
        switch (file.result) {
            case 'added':
                console.log(`Added ${file.filename}`);
                console.log(clc.green(file.bCode));
                break;
            case 'changed':
                console.log(`Changed ${file.filename}`);
                (0, diff_1.diffCode)(file.aCode, file.bCode, options.lineBuffer);
                break;
            case 'removed':
                console.log(`Removed ${file.filename}`);
                console.log(clc.red(file.aCode));
                break;
        }
    }
    // If filtering on an aFile, but it was not found
    if (options.aFile && !aFileFound) {
        throw new Error(`Could not display code diff for file "${options.aFile}".\nMake sure the full file path and extension is used as displayed in the file summary.`);
    }
};
exports.displayFileDiffs = displayFileDiffs;
//# sourceMappingURL=diffContracts.js.map