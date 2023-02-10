import { lstatSync, readFileSync } from 'fs'
import { basename, extname, relative } from 'path'
import klaw from 'klaw'
import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types'
import { parse } from '@solidity-parser/parser'

import { convertAST2UmlClasses } from './converterAST2Classes'
import { UmlClass } from './umlClass'

const debug = require('debug')('sol2uml')

export const parseUmlClassesFromFiles = async (
    filesOrFolders: readonly string[],
    ignoreFilesOrFolders: readonly string[],
    subfolders: number = -1
): Promise<UmlClass[]> => {
    const files = await getSolidityFilesFromFolderOrFiles(
        filesOrFolders,
        ignoreFilesOrFolders,
        subfolders
    )

    let umlClasses: UmlClass[] = []

    for (const file of files) {
        const node = await parseSolidityFile(file)

        const relativePath = relative(process.cwd(), file)

        const umlClass = convertAST2UmlClasses(node, relativePath, [], true)
        umlClasses = umlClasses.concat(umlClass)
    }

    return umlClasses
}

export async function getSolidityFilesFromFolderOrFiles(
    folderOrFilePaths: readonly string[],
    ignoreFilesOrFolders: readonly string[],
    subfolders: number = -1
): Promise<string[]> {
    let files: string[] = []

    for (const folderOrFilePath of folderOrFilePaths) {
        const result = await getSolidityFilesFromFolderOrFile(
            folderOrFilePath,
            ignoreFilesOrFolders,
            subfolders
        )
        files = files.concat(result)
    }

    return files
}

export function getSolidityFilesFromFolderOrFile(
    folderOrFilePath: string,
    ignoreFilesOrFolders: readonly string[] = [],
    depthLimit: number = -1
): Promise<string[]> {
    debug(`About to get Solidity files under ${folderOrFilePath}`)

    return new Promise<string[]>((resolve, reject) => {
        try {
            const folderOrFile = lstatSync(folderOrFilePath)

            if (folderOrFile.isDirectory()) {
                const files: string[] = []

                // filter out files or folders that are to be ignored
                const filter = (file: string): boolean => {
                    return !ignoreFilesOrFolders.includes(basename(file))
                }

                klaw(folderOrFilePath, {
                    depthLimit,
                    filter,
                    preserveSymlinks: true,
                })
                    .on('data', (file) => {
                        if (
                            // If file has sol extension
                            extname(file.path) === '.sol' &&
                            // and file and not a folder
                            // Note Foundry's forge outputs folders with the same name as the source file
                            file.stats.isFile()
                        )
                            files.push(file.path)
                    })
                    .on('end', () => {
                        debug(`Got Solidity files to be parsed: ${files}`)
                        resolve(files)
                    })
            } else if (folderOrFile.isFile()) {
                if (extname(folderOrFilePath) === '.sol') {
                    debug(`Got Solidity file to be parsed: ${folderOrFilePath}`)
                    resolve([folderOrFilePath])
                } else {
                    reject(
                        Error(
                            `File ${folderOrFilePath} does not have a .sol extension.`
                        )
                    )
                }
            } else {
                reject(
                    Error(
                        `Could not find directory or file ${folderOrFilePath}`
                    )
                )
            }
        } catch (err) {
            let error: Error
            if (err?.code === 'ENOENT') {
                error = Error(
                    `No such file or folder ${folderOrFilePath}. Make sure you pass in the root directory of the contracts`
                )
            } else {
                error = new Error(
                    `Failed to get Solidity files under folder or file ${folderOrFilePath}`,
                    { cause: err }
                )
            }

            console.error(error)
            reject(error)
        }
    })
}

export function parseSolidityFile(fileName: string): ASTNode {
    let solidityCode: string
    try {
        solidityCode = readFileSync(fileName, 'utf8')
    } catch (err) {
        throw new Error(`Failed to read solidity file ${fileName}.`, {
            cause: err,
        })
    }
    try {
        return parse(solidityCode, {})
    } catch (err) {
        throw new Error(`Failed to parse solidity code in file ${fileName}.`, {
            cause: err,
        })
    }
}
