import { readFile } from 'fs'
import { convertUmlClasses2Dot, EtherscanParser } from '../index'
import { convertDot2Svg, writeSVG } from '../writerFiles'

const etherDelta = '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819'

describe('Converter', () => {
    test('generateFilesFromUmlClasses a valid dot to svg', (done) => {
        readFile('./src/ts/__tests__/SomeImpl.dot', (err, dotBuf) => {
            if (err) {
                throw err
            }

            const dotString = dotBuf.toString('utf8')
            const svg = convertDot2Svg(dotString)
            expect(typeof svg).toEqual('string')
            expect(svg.length).toBeGreaterThan(2000)

            done()
        })
    })

    test('writeSVG with invalid dot', () => {
        const dot = ''
        writeSVG(dot, 'converterTest')
    })

    test('Parse EtherDelta from Etherscan and convert to svg string', async () => {
        const etherscan = new EtherscanParser(process.env.SCAN_API_KEY)

        const { umlClasses } = await etherscan.getUmlClasses(etherDelta)

        const dotString = convertUmlClasses2Dot(umlClasses)

        const svg = convertDot2Svg(dotString)

        expect(svg).toMatch(/xml version/)
        expect(svg).toMatch(/DOCTYPE svg PUBLIC/)
        expect(svg).toMatch(/ReserveToken/)
        expect(svg).toMatch(/EtherDelta/)
    }, 10000)
})
