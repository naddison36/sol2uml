import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { UmlClass } from './umlClass';
/**
 * Convert solidity parser output of type `ASTNode` to UML classes of type `UMLClass`
 * @param node output of Solidity parser of type `ASTNode`
 * @param relativePath relative path from the working directory to the Solidity source file
 * @param filesystem flag if Solidity source code was parsed from the filesystem or Etherscan
 * @return umlClasses array of UML class definitions of type `UmlClass`
 */
export declare function convertAST2UmlClasses(node: ASTNode, relativePath: string, filesystem?: boolean): UmlClass[];
