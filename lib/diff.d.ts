/**
 * Compares code using Google's diff_match_patch and displays the results in the console.
 * @param codeA
 * @param codeB
 * @param lineBuff the number of lines to display before and after each change.
 */
export declare const diffCode: (codeA: string, codeB: string, lineBuff: number) => void;
