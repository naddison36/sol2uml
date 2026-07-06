import { lstatSync, readFileSync } from 'fs'
import { basename, dirname, extname, join, relative, resolve } from 'path'
import klaw from 'klaw'
import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types'
import { parse } from '@solidity-parser/parser'

import { convertAST2UmlClasses } from './converterAST2Classes'
import { UmlClass } from './umlClass'
import { Remapping, parseRemapping } from './parserEtherscan'

const debug = require('debug')('sol2uml')

const parseFoundryTomlRemappings = (content: string): Remapping[] => {
    const match = content.match(/^remappings\s*=\s*\[([^\]]*)\]/ms)
    if (!match) return []
    const remappings: Remapping[] = []
    for (const line of match[1].split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const stringMatch = trimmed.match(/^"([^"]+)"/)
        if (stringMatch) {
            try {
                remappings.push(parseRemapping(stringMatch[1]))
            } catch {
                // skip invalid remapping entries
            }
        }
    }
    return remappings
}

const findFoundryTomlRemappings = (
    startPath: string,
): { remappings: Remapping[]; base: string } | null => {
    let dir: string
    try {
        dir = lstatSync(startPath).isDirectory()
            ? resolve(startPath)
            : dirname(resolve(startPath))
    } catch {
        dir = resolve(startPath)
    }
    while (true) {
        const foundryTomlPath = join(dir, 'foundry.toml')
        try {
            const content = readFileSync(foundryTomlPath, 'utf8')
            const remappings = parseFoundryTomlRemappings(content)
            if (remappings.length > 0) {
                debug(
                    `Found ${remappings.length} Foundry remappings in ${foundryTomlPath}`,
                )
                return { remappings, base: dir }
            }
        } catch {
            // file not found, search parent
        }
        const parent = dirname(dir)
        if (parent === dir) break
        dir = parent
    }
    return null
}

export const parseUmlClassesFromFiles = async (
    filesOrFolders: readonly string[],
    ignoreFilesOrFolders: readonly string[],
    subfolders: number = -1,
): Promise<UmlClass[]> => {
    const files = await getSolidityFilesFromFolderOrFiles(
        filesOrFolders,
        ignoreFilesOrFolders,
        subfolders,
    )

    // Auto-detect Foundry remappings to resolve non-npm imports (e.g. soldeer dependencies)
    let remappings: Remapping[] = []
    let remappingsBase: string | undefined
    const foundryResult = findFoundryTomlRemappings(
        filesOrFolders[0] || process.cwd(),
    )
    if (foundryResult) {
        remappings = foundryResult.remappings
        remappingsBase = foundryResult.base
    }

    let umlClasses: UmlClass[] = []

    for (const file of files) {
        const node = await parseSolidityFile(file)

        const relativePath = relative(process.cwd(), file)

        const newUmlClasses = convertAST2UmlClasses(
            node,
            relativePath,
            remappings,
            true,
            remappingsBase,
        )
        umlClasses = umlClasses.concat(newUmlClasses)
    }

    return umlClasses
}

export async function getSolidityFilesFromFolderOrFiles(
    folderOrFilePaths: readonly string[],
    ignoreFilesOrFolders: readonly string[],
    subfolders: number = -1,
): Promise<string[]> {
    let files: string[] = []

    for (const folderOrFilePath of folderOrFilePaths) {
        const result = await getSolidityFilesFromFolderOrFile(
            folderOrFilePath,
            ignoreFilesOrFolders,
            subfolders,
        )
        files = files.concat(result)
    }

    return files
}

export function getSolidityFilesFromFolderOrFile(
    folderOrFilePath: string,
    ignoreFilesOrFolders: readonly string[] = [],
    depthLimit: number = -1,
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
                        // debug(`Got Solidity files to be parsed: ${files}`)
                        resolve(files)
                    })
            } else if (folderOrFile.isFile()) {
                if (extname(folderOrFilePath) === '.sol') {
                    debug(`Got Solidity file to be parsed: ${folderOrFilePath}`)
                    resolve([folderOrFilePath])
                } else {
                    reject(
                        Error(
                            `File ${folderOrFilePath} does not have a .sol extension.`,
                        ),
                    )
                }
            } else {
                reject(
                    Error(
                        `Could not find directory or file ${folderOrFilePath}`,
                    ),
                )
            }
        } catch (err) {
            let error: Error
            if (err?.code === 'ENOENT') {
                error = Error(
                    `No such file or folder ${folderOrFilePath}. Make sure you pass in the root directory of the contracts`,
                )
            } else {
                error = new Error(
                    `Failed to get Solidity files under folder or file ${folderOrFilePath}`,
                    { cause: err },
                )
            }

            console.error(error)
            reject(error)
        }
    })
}

export function parseSolidityFile(fileName: string): ASTNode {
    const solidityCode = readFile(fileName)
    try {
        return parse(solidityCode, {})
    } catch (err) {
        throw new Error(`Failed to parse solidity code in file ${fileName}.`, {
            cause: err,
        })
    }
}

export const readFile = (fileName: string, extension?: string): string => {
    try {
        // try to read file with no extension
        return readFileSync(fileName, 'utf8')
    } catch (err) {
        if (!extension) {
            throw new Error(`Failed to read file "${fileName}".`, {
                cause: err,
            })
        }

        try {
            // try to read file with extension
            return readFileSync(`${fileName}.${extension}`, 'utf8')
        } catch (err) {
            throw new Error(
                `Failed to read file "${fileName}" or "${fileName}.${extension}".`,
                {
                    cause: err,
                },
            )
        }
    }
}

export const isFile = (fileName: string): boolean => {
    try {
        const file = lstatSync(fileName)
        return file.isFile()
    } catch {
        return false
    }
}
export const isFolder = (fileName: string): boolean => {
    try {
        const file = lstatSync(fileName)
        return file.isDirectory()
    } catch {
        return false
    }
}
