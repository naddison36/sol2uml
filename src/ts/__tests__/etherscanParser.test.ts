import { EtherscanParser, parseRemapping, renameFile } from '../index'

jest.setTimeout(20000) // timeout for each test in milliseconds

const etherDelta = '0x8d12A197cB00D4747a1fe03395095ce2A5CC6819'

describe('Etherscan', () => {
    test('get source code', async () => {
        const etherscan = new EtherscanParser(
            'HPD85TXCG1HW3N5G6JJXK1A7EE5K86CYBJ'
        )

        const sourceCode = await etherscan.getSourceCode(
            '0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413'
        )
        expect(sourceCode.files).toHaveLength(1)
        expect(sourceCode.contractName).toEqual('DAO')
        expect(sourceCode.compilerVersion).toEqual('v0.3.1-2016-04-12-3ad5e82')
    })

    test('Get UML Classes', async () => {
        const etherscan = new EtherscanParser(
            'HPD85TXCG1HW3N5G6JJXK1A7EE5K86CYBJ'
        )

        const { umlClasses } = await etherscan.getUmlClasses(etherDelta)

        expect(umlClasses).toHaveLength(7)
    })

    test('Try and get UML Classes when address does not have verified source code', async () => {
        expect.assertions(1)

        const etherscan = new EtherscanParser(
            'HPD85TXCG1HW3N5G6JJXK1A7EE5K86CYBJ'
        )

        try {
            await etherscan.getUmlClasses(
                '0x0000000000000000000000000000000000000001'
            )
        } catch (err) {
            expect(err.message).toMatch(
                /Failed to get verified source code for address 0x0000000000000000000000000000000000000001 from Etherscan API/
            )
        }
    })
    describe('remapping filename ', () => {
        test.each`
            fileName                                                                      | mapping                                         | expected
            ${'@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol'}                 | ${'@openzeppelin/=lib/openzeppelin-contracts/'} | ${'lib/openzeppelin-contracts/contracts/token/ERC721/IERC721Receiver.sol'}
            ${'@openzeppelin/IERC20.sol'}                                                 | ${'@openzeppelin/=lib/openzeppelin-contracts/'} | ${'lib/openzeppelin-contracts/IERC20.sol'}
            ${'@openzeppelin/lib/openzeppelin-contracts/IERC20.sol'}                      | ${'@openzeppelin/=lib/openzeppelin-contracts/'} | ${'lib/openzeppelin-contracts/lib/openzeppelin-contracts/IERC20.sol'}
            ${'node_modules/@openzeppelin/contracts-upgradeable/proxy/Initializable.sol'} | ${'node_modules/='}                             | ${'@openzeppelin/contracts-upgradeable/proxy/Initializable.sol'}
            ${'Interface.sol'}                                                            | ${'face=xxx'}                                   | ${'Interface.sol'}
            ${'./contracts/Interface.sol'}                                                | ${'node_modules/='}                             | ${'./contracts/Interface.sol'}
            ${'Interface.sol'}                                                            | ${'I=III'}                                      | ${'IIInterface.sol'}
            ${'Interface.sol'}                                                            | ${'i=xxx'}                                      | ${'Interface.sol'}
        `('$mapping ', ({ fileName, mapping, expected }) => {
            const remapping = parseRemapping(mapping)
            expect(renameFile(fileName, [remapping])).toEqual(expected)
        })
    })
})
