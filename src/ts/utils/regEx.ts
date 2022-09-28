export const isAddress = (input: string): boolean => {
    return input.match(/^0x([A-Fa-f0-9]{40})$/) !== null
}

export const parseSolidityVersion = (compilerVersion: string): string => {
    const result = compilerVersion.match(`v(\\d+.\\d+.\\d+)`)
    if (result[1]) {
        return result[1]
    }
    throw Error(`Failed to parse compiler version ${compilerVersion}`)
}
