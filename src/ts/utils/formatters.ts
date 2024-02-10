export const shortBytes32 = (bytes32: string): string => {
    if (!bytes32) return ''
    if (typeof bytes32 !== 'string' || bytes32.length !== 66) return bytes32
    return bytes32.slice(0, 5) + '..' + bytes32.slice(-3)
}

export const commify = (
    value: string,
    includeFrac: boolean = false,
): string => {
    const match = value.match(/^(-?)([0-9]*)(\.?)([0-9]*)$/)
    if (!match || (!match[2] && !match[4])) {
        throw new Error(`bad formatted number: ${JSON.stringify(value)}`)
    }

    const neg = match[1]
    const whole = BigInt(match[2] || 0).toLocaleString('en-us')

    if (!includeFrac) {
        return `${neg}${whole}`
    }

    const frac = match[4] ? match[4].match(/^(.*?)0*$/)[1] : '0'

    return `${neg}${whole}.${frac}`
}
