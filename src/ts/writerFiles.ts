import { lstatSync, writeFile } from 'fs'
import path from 'path'
import vizRenderStringSync from '@aduh95/viz.js/sync'
const { convert } = require('convert-svg-to-png')

const debug = require('debug')('sol2uml')

export type OutputFormats = 'svg' | 'png' | 'dot' | 'all'

/**
 * Writes output files to the file system based on the provided input and options.
 * @param dot The input string in DOT format.
 * @param contractName The name of the contract.
 * @param outputFormat The format of the output file. choices: svg, png, dot or all. default: png
 * @param outputFilename optional filename of the output file.
 */
export const writeOutputFiles = async (
    dot: string,
    contractName: string,
    outputFormat: OutputFormats = 'svg',
    outputFilename?: string
): Promise<void> => {
    // If all output then extension is svg
    const outputExt = outputFormat === 'all' ? 'svg' : outputFormat

    if (!outputFilename) {
        outputFilename =
            path.join(process.cwd(), contractName) + '.' + outputExt
    } else {
        // check if outputFilename is a folder
        try {
            const folderOrFile = lstatSync(outputFilename)
            if (folderOrFile.isDirectory()) {
                outputFilename =
                    path.join(process.cwd(), outputFilename, contractName) +
                    '.' +
                    outputExt
            }
        } catch (err) {} // we can ignore errors as it just means outputFilename does not exist yet
    }

    if (outputFormat === 'dot' || outputFormat === 'all') {
        writeDot(dot, outputFilename)

        // No need to continue if only generating a dot file
        if (outputFormat === 'dot') {
            return
        }
    }

    const svg = convertDot2Svg(dot)

    if (outputFormat === 'svg' || outputFormat === 'all') {
        await writeSVG(svg, outputFilename, outputFormat)
    }

    if (outputFormat === 'png' || outputFormat === 'all') {
        await writePng(svg, outputFilename)
    }
}

export function convertDot2Svg(dot: string): any {
    debug(`About to convert dot to SVG`)

    try {
        return vizRenderStringSync(dot)
    } catch (err) {
        console.error(`Failed to convert dot to SVG. ${err.message}`)
        console.log(dot)
        throw new Error(`Failed to parse dot string`, { cause: err })
    }
}

export function writeSolidity(code: string, filename = 'solidity') {
    const extension = path.extname(filename)
    const outputFile = extension === '.sol' ? filename : filename + '.sol'
    debug(`About to write Solidity to file ${outputFile}`)

    writeFile(outputFile, code, (err) => {
        if (err) {
            throw new Error(`Failed to write Solidity to file ${outputFile}`, {
                cause: err,
            })
        } else {
            console.log(`Solidity written to ${outputFile}`)
        }
    })
}

export function writeDot(dot: string, filename: string) {
    debug(`About to write Dot file to ${filename}`)

    writeFile(filename, dot, (err) => {
        if (err) {
            throw new Error(`Failed to write Dot file to ${filename}`, {
                cause: err,
            })
        } else {
            console.log(`Dot file written to ${filename}`)
        }
    })
}

/**
 * Writes an SVG file to the file system.
 * @param svg The SVG input to be written to the file system.
 * @param svgFilename The desired file name for the SVG file. default: classDiagram.svg
 * @param outputFormats The format of the output file. choices: svg, png, dot or all. default: png
 * @throws Error - If there is an error writing the SVG file.
 */
export function writeSVG(
    svg: any,
    svgFilename = 'classDiagram.svg',
    outputFormats: OutputFormats = 'png'
): Promise<void> {
    debug(`About to write SVN file to ${svgFilename}`)

    if (outputFormats === 'png') {
        const parsedFile = path.parse(svgFilename)
        if (!parsedFile.dir) {
            svgFilename = process.cwd() + '/' + parsedFile.name + '.svg'
        } else {
            svgFilename = parsedFile.dir + '/' + parsedFile.name + '.svg'
        }
    }

    return new Promise<void>((resolve, reject) => {
        writeFile(svgFilename, svg, (err) => {
            if (err) {
                reject(
                    new Error(`Failed to write SVG file to ${svgFilename}`, {
                        cause: err,
                    })
                )
            } else {
                console.log(`Generated svg file ${svgFilename}`)
                resolve()
            }
        })
    })
}

/**
 * Asynchronously writes a PNG file to the file system from an SVG input.
 * @param svg - The SVG input to be converted to a PNG file.
 * @param filename - The desired file name for the PNG file.
 * @throws Error - If there is an error converting or writing the PNG file.
 */
export async function writePng(svg: any, filename: string): Promise<void> {
    // get svg file name from png file name
    const parsedPngFile = path.parse(filename)
    const pngDir =
        parsedPngFile.dir === '' ? '.' : path.resolve(parsedPngFile.dir)
    const pngFilename = pngDir + '/' + parsedPngFile.name + '.png'

    debug(`About to write png file ${pngFilename}`)

    try {
        const png = await convert(svg, {
            outputFilePath: pngFilename,
        })

        return new Promise<void>((resolve, reject) => {
            writeFile(pngFilename, png, (err) => {
                if (err) {
                    reject(
                        new Error(
                            `Failed to write PNG file to ${pngFilename}`,
                            {
                                cause: err,
                            }
                        )
                    )
                } else {
                    console.log(`Generated png file ${pngFilename}`)
                    resolve()
                }
            })
        })
    } catch (err) {
        throw new Error(`Failed to convert PNG file ${pngFilename}`, {
            cause: err,
        })
    }
}
