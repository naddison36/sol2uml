import { diffCode } from '../utils/diff'

describe('Diff', () => {
    describe('2 line buffer', () => {
        test.each`
            description                      | codeA                                                                       | codeB
            ${'no change single line'}       | ${'a simple line of text'}                                                  | ${'a simple line of text'}
            ${'addition to single line'}     | ${'a simple line of text'}                                                  | ${'a simple line of normal text'}
            ${'deletion from a single line'} | ${'a simple line of text'}                                                  | ${'a line of text'}
            ${'replaced first line'}         | ${'line 1\nline 2\nline 3'}                                                 | ${'change in first row\nline 2\nline 3'}
            ${'replaced first two line'}     | ${'line 1\nline 2\nline 3'}                                                 | ${'change in first row\nand the second\nline 3'}
            ${'replaced all lines'}          | ${'line 1\nline 2\nline 3'}                                                 | ${'change in first row\nand the second\nand the third'}
            ${'no change in 2 lines'}        | ${'line 1\nline 2'}                                                         | ${'line 1\nline 2'}
            ${'no change in 9 lines'}        | ${'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9'} | ${'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9'}
            ${'added to fourth line'}        | ${'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9'} | ${'line 1\nline 2\nline 3\n1ine 42434\nline 5\nline 6\nline 7\nline 8\nline 9'}
            ${'changed fourth line'}         | ${'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9'} | ${'line 1\nline 2\nline 3\nline 42434\nline 5\nline 6\nadded 8\nline 9'}
            ${'large block between changes'} | ${'line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9'} | ${'line one\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nadded two\nnew lines'}
        `('$description', ({ codeA, codeB }) => {
            diffCode(codeA, codeB, 2)
        })
    })
})
