"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePng = exports.writeSVG = exports.writeDot = exports.writeSolidity = exports.convertDot2Svg = exports.writeOutputFiles = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const sync_1 = __importDefault(require("@aduh95/viz.js/sync"));
const { convert } = require('convert-svg-to-png');
const debug = require('debug')('sol2uml');
/**
 * Writes output files to the file system based on the provided input and options.
 * @param dot The input string in DOT format.
 * @param contractName The name of the contract.
 * @param outputFormat The format of the output file. choices: svg, png, dot or all. default: png
 * @param outputFilename optional filename of the output file.
 */
const writeOutputFiles = async (dot, contractName, outputFormat = 'svg', outputFilename) => {
    // If all output then extension is svg
    const outputExt = outputFormat === 'all' ? 'svg' : outputFormat;
    if (!outputFilename) {
        outputFilename =
            path_1.default.join(process.cwd(), contractName) + '.' + outputExt;
    }
    else {
        // check if outputFilename is a folder
        try {
            const folderOrFile = (0, fs_1.lstatSync)(outputFilename);
            if (folderOrFile.isDirectory()) {
                outputFilename =
                    path_1.default.join(process.cwd(), outputFilename, contractName) +
                        '.' +
                        outputExt;
            }
        }
        catch (err) { } // we can ignore errors as it just means outputFilename does not exist yet
    }
    if (outputFormat === 'dot' || outputFormat === 'all') {
        writeDot(dot, outputFilename);
        // No need to continue if only generating a dot file
        if (outputFormat === 'dot') {
            return;
        }
    }
    const svg = convertDot2Svg(dot);
    if (outputFormat === 'svg' || outputFormat === 'all') {
        await writeSVG(svg, outputFilename, outputFormat);
    }
    if (outputFormat === 'png' || outputFormat === 'all') {
        await writePng(svg, outputFilename);
    }
};
exports.writeOutputFiles = writeOutputFiles;
function convertDot2Svg(dot) {
    debug(`About to convert dot to SVG`);
    try {
        return (0, sync_1.default)(dot);
    }
    catch (err) {
        console.error(`Failed to convert dot to SVG. ${err.message}`);
        console.log(dot);
        throw new Error(`Failed to parse dot string`, { cause: err });
    }
}
exports.convertDot2Svg = convertDot2Svg;
function writeSolidity(code, filename = 'solidity') {
    const extension = path_1.default.extname(filename);
    const outputFile = extension === '.sol' ? filename : filename + '.sol';
    debug(`About to write Solidity to file ${outputFile}`);
    (0, fs_1.writeFile)(outputFile, code, (err) => {
        if (err) {
            throw new Error(`Failed to write Solidity to file ${outputFile}`, {
                cause: err,
            });
        }
        else {
            console.log(`Solidity written to ${outputFile}`);
        }
    });
}
exports.writeSolidity = writeSolidity;
function writeDot(dot, filename) {
    debug(`About to write Dot file to ${filename}`);
    (0, fs_1.writeFile)(filename, dot, (err) => {
        if (err) {
            throw new Error(`Failed to write Dot file to ${filename}`, {
                cause: err,
            });
        }
        else {
            console.log(`Dot file written to ${filename}`);
        }
    });
}
exports.writeDot = writeDot;
/**
 * Writes an SVG file to the file system.
 * @param svg The SVG input to be written to the file system.
 * @param svgFilename The desired file name for the SVG file. default: classDiagram.svg
 * @param outputFormats The format of the output file. choices: svg, png, dot or all. default: png
 * @throws Error - If there is an error writing the SVG file.
 */
function writeSVG(svg, svgFilename = 'classDiagram.svg', outputFormats = 'png') {
    debug(`About to write SVN file to ${svgFilename}`);
    if (outputFormats === 'png') {
        const parsedFile = path_1.default.parse(svgFilename);
        if (!parsedFile.dir) {
            svgFilename = process.cwd() + '/' + parsedFile.name + '.svg';
        }
        else {
            svgFilename = parsedFile.dir + '/' + parsedFile.name + '.svg';
        }
    }
    return new Promise((resolve, reject) => {
        (0, fs_1.writeFile)(svgFilename, svg, (err) => {
            if (err) {
                reject(new Error(`Failed to write SVG file to ${svgFilename}`, {
                    cause: err,
                }));
            }
            else {
                console.log(`Generated svg file ${svgFilename}`);
                resolve();
            }
        });
    });
}
exports.writeSVG = writeSVG;
/**
 * Asynchronously writes a PNG file to the file system from an SVG input.
 * @param svg - The SVG input to be converted to a PNG file.
 * @param filename - The desired file name for the PNG file.
 * @throws Error - If there is an error converting or writing the PNG file.
 */
async function writePng(svg, filename) {
    // get svg file name from png file name
    const parsedPngFile = path_1.default.parse(filename);
    const pngDir = parsedPngFile.dir === '' ? '.' : path_1.default.resolve(parsedPngFile.dir);
    const pngFilename = pngDir + '/' + parsedPngFile.name + '.png';
    debug(`About to write png file ${pngFilename}`);
    try {
        const png = await convert(svg, {
            outputFilePath: pngFilename,
        });
        return new Promise((resolve, reject) => {
            (0, fs_1.writeFile)(pngFilename, png, (err) => {
                if (err) {
                    reject(new Error(`Failed to write PNG file to ${pngFilename}`, {
                        cause: err,
                    }));
                }
                else {
                    console.log(`Generated png file ${pngFilename}`);
                    resolve();
                }
            });
        });
    }
    catch (err) {
        throw new Error(`Failed to convert PNG file ${pngFilename}`, {
            cause: err,
        });
    }
}
exports.writePng = writePng;
//# sourceMappingURL=writerFiles.js.map