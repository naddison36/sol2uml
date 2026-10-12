import { execFile } from 'child_process'
import { mkdtemp, readFile, rm, access } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Run in Node so Puppeteer's ESM dependencies use the same loader as the CLI.
const renderPng = (svg: string, filename: string) =>
    execFileAsync(
        process.execPath,
        [
            '-r',
            'ts-node/register',
            '-e',
            `require('./src/ts/writerFiles').writePng(process.argv[1], process.argv[2])
                .catch(error => { console.error(error.cause); process.exitCode = 1 })`,
            svg,
            filename,
        ],
        { cwd: path.resolve(__dirname, '../../..'), timeout: 20000 },
    )

describe('PNG export', () => {
    let directory: string

    beforeEach(async () => {
        directory = await mkdtemp(path.join(tmpdir(), 'sol2uml-png-'))
    })

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true })
    })

    test.each([
        [160, 80],
        [1200, 1800],
    ])(
        'preserves SVG dimensions %i x %i',
        async (width, height) => {
            const filename = path.join(directory, 'diagram.png')
            await renderPng(
                `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="40" height="40" fill="red"/></svg>`,
                filename,
            )
            const png = await readFile(filename)
            expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
            expect(png.readUInt32BE(16)).toBe(width)
            expect(png.readUInt32BE(20)).toBe(height)
            // PNG color type 6 preserves an alpha channel for transparent diagrams.
            expect(png[25]).toBe(6)
        },
        30000,
    )

    test('rejects missing SVG and exits without leaving a browser running', async () => {
        const filename = path.join(directory, 'invalid.png')
        await expect(
            renderPng('<html></html>', filename),
        ).rejects.toMatchObject({
            code: 1,
            killed: false,
            stderr: expect.stringContaining('SVG element not found in input'),
        })
        await expect(access(filename)).rejects.toMatchObject({ code: 'ENOENT' })
    }, 30000)
})
