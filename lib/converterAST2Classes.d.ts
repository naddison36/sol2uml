import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { UmlClass } from './umlClass';
import { Remapping } from './parserEtherscan';
/**
 * Convert solidity parser output of type `ASTNode` to UML classes of type `UMLClass`
 * @param node output of Solidity parser of type `ASTNode`
 * @param relativePath relative path from the working directory to the Solidity source file
 * @param remappings used to rename relative paths
 * @param filesystem flag if Solidity source code was parsed from the filesystem or Etherscan
 * @return umlClasses array of UML class definitions of type `UmlClass`
 */
export declare function convertAST2UmlClasses(node: ASTNode, relativePath: string, remappings: Remapping[], filesystem?: boolean): UmlClass[];
/**
 * Used to rename import file names. For example
 * @openzeppelin/contracts/token/ERC721/IERC721Receiver.sol
 * to
 * lib/openzeppelin-contracts/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol
 * @param fileName file name in the Solidity code
 * @param mappings an array of remappings from Etherscan's settings
 */
export declare const renameFile: (fileName: string, mappings: Remapping[]) => string;
