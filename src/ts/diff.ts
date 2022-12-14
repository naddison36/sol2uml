import diff_match_patch, {
    DIFF_DELETE,
    DIFF_INSERT,
    DIFF_EQUAL,
    Diff,
} from 'diff-match-patch'
const clc = require('cli-color')

const SkippedLinesMarker = `\n---`

/**
 * Compares code using Google's diff_match_patch and displays the results in the console.
 * @param codeA
 * @param codeB
 * @param lineBuff the number of lines to display before and after each change.
 */
export const diffCode = (codeA: string, codeB: string, lineBuff: number) => {
    // @ts-ignore
    const dmp = new diff_match_patch()
    const diff = dmp.diff_main(codeA, codeB)
    dmp.diff_cleanupSemantic(diff)

    const linesB = countLines(codeB) + 1
    diff_pretty(diff, linesB, lineBuff)
}

/**
 * Convert a diff array into human readable for the console
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param lines number of a lines in the second contract B
 * @param lineBuff number of a lines to output before and after the change
 */
const diff_pretty = (diffs: Diff[], lines: number, lineBuff = 2) => {
    const linePad = lines.toString().length
    let output = ''
    let diffIndex = 0
    let lineCount = 1
    const firstLineNumber = '1'.padStart(linePad) + ' '

    for (const diff of diffs) {
        diffIndex++
        const initialLineNumber = diffIndex <= 1 ? firstLineNumber : ''
        const op = diff[0] // Operation (insert, delete, equal)
        const text: string = diff[1] // Text of change.
        switch (op) {
            case DIFF_INSERT:
                // If first diff then we need to add the first line number
                const linesInserted = addLineNumbers(text, lineCount, linePad)
                output += initialLineNumber + clc.green(linesInserted)
                lineCount += countLines(text)
                break
            case DIFF_DELETE:
                // zero start line means blank line numbers are used
                const linesDeleted = addLineNumbers(text, 0, linePad)
                output += initialLineNumber + clc.red(linesDeleted)
                break
            case DIFF_EQUAL:
                const eolPositions = findEOLPositions(text)

                // If no changes yet
                if (diffIndex <= 1) {
                    output += lastLines(text, eolPositions, lineBuff, linePad)
                }
                // if no more changes
                else if (diffIndex === diffs.length) {
                    output += firstLines(
                        text,
                        eolPositions,
                        lineBuff,
                        lineCount,
                        linePad
                    )
                } else {
                    // else the first n lines and last n lines
                    output += firstAndLastLines(
                        text,
                        eolPositions,
                        lineBuff,
                        lineCount,
                        linePad
                    )
                }
                lineCount += eolPositions.length
                break
        }
    }

    output += '\n'
    console.log(output)
}

/**
 * Used when there is no more changes left
 */
const firstLines = (
    text: string,
    eolPositions: number[],
    lineBuff: number,
    lineStart: number,
    linePad: number
): string => {
    const lines = text.slice(0, eolPositions[lineBuff])
    return addLineNumbers(lines, lineStart, linePad)
}

/**
 * Used before the first change
 */
const lastLines = (
    text: string,
    eolPositions: number[],
    lineBuff: number,
    linePad: number
): string => {
    const eolFrom = eolPositions.length - (lineBuff + 1)
    let lines = text
    let lineCount = 1
    if (eolFrom >= 0) {
        lines = eolFrom >= 0 ? text.slice(eolPositions[eolFrom] + 1) : text
        lineCount = eolFrom + 2
    }
    const firstLineNumber = lineCount.toString().padStart(linePad) + ' '
    return firstLineNumber + addLineNumbers(lines, lineCount, linePad)
}

/**
 * Used between changes to show the lines after the last change and before the next change.
 * @param text
 * @param eolPositions
 * @param lineBuff
 * @param lineStart
 * @param linePad
 */
const firstAndLastLines = (
    text: string,
    eolPositions: number[],
    lineBuff: number,
    lineStart: number,
    linePad: number
): string => {
    if (eolPositions.length <= 2 * lineBuff) {
        return addLineNumbers(text, lineStart, linePad)
    }
    const endFirstLines = eolPositions[lineBuff]

    const eolFrom = eolPositions.length - (lineBuff + 1)
    const startLastLines = eolPositions[eolFrom]

    if (startLastLines <= endFirstLines) {
        return addLineNumbers(text, lineStart, linePad)
    }

    // Lines after the previous change
    let lines = text.slice(0, endFirstLines)
    let output = addLineNumbers(lines, lineStart, linePad)

    output += SkippedLinesMarker

    // Lines before the next change
    lines = text.slice(startLastLines)
    const lineCount = lineStart + eolFrom
    output += addLineNumbers(lines, lineCount, linePad)

    return output
}

/**
 * Gets the positions of the end of lines in the string
 * @param text
 */
const findEOLPositions = (text: string): number[] => {
    const eolPositions: number[] = []
    text.split('').forEach((c, i) => {
        if (c === '\n') {
            eolPositions.push(i)
        }
    })
    return eolPositions
}

/**
 * Counts the number of carriage returns in a string
 * @param text
 */
const countLines = (text: string): number => (text.match(/\n/g) || '').length

/**
 * Adds left padded line numbers to each line.
 * @param text with the lines of code
 * @param lineStart the line number of the first line in the text. If zero, then no lines numbers are added.
 * @param linePad the width of the largest number which may not be in the text
 */
const addLineNumbers = (
    text: string,
    lineStart: number,
    linePad: number
): string => {
    let lineCount = lineStart
    let textWithLineNumbers = ''
    text.split('').forEach((c, i) => {
        if (c === '\n') {
            if (lineStart > 0) {
                textWithLineNumbers += `\n${(++lineCount)
                    .toString()
                    .padStart(linePad)} `
            } else {
                textWithLineNumbers += `\n${' '.repeat(linePad)} `
            }
        } else {
            textWithLineNumbers += c
        }
    })
    return textWithLineNumbers
}
