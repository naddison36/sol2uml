import {
    ASTNode,
    ContractDefinition,
    ElementaryTypeName,
    EnumDefinition,
    EnumValue,
    Expression,
    StateVariableDeclarationVariable,
    StructDefinition,
    TypeName,
    UserDefinedTypeName,
    UsingForDeclaration,
    VariableDeclaration,
} from '@solidity-parser/parser/dist/src/ast-types'
import * as path from 'path'
import { posix } from 'path'

import {
    AttributeType,
    ClassStereotype,
    Import,
    OperatorStereotype,
    Parameter,
    ReferenceType,
    UmlClass,
    Visibility,
} from './umlClass'
import {
    isEnumDefinition,
    isEventDefinition,
    isFunctionDefinition,
    isModifierDefinition,
    isStateVariableDeclaration,
    isStructDefinition,
    isUsingForDeclaration,
} from './typeGuards'
import { Remapping } from './parserEtherscan'

const debug = require('debug')('sol2uml')

let umlClasses: UmlClass[]

/**
 * Convert solidity parser output of type `ASTNode` to UML classes of type `UMLClass`
 * @param node output of Solidity parser of type `ASTNode`
 * @param relativePath relative path from the working directory to the Solidity source file
 * @param remappings used to rename relative paths
 * @param filesystem flag if Solidity source code was parsed from the filesystem or Etherscan
 * @return umlClasses array of UML class definitions of type `UmlClass`
 */
export function convertAST2UmlClasses(
    node: ASTNode,
    relativePath: string,
    remappings: Remapping[],
    filesystem: boolean = false
): UmlClass[] {
    const imports: Import[] = []
    umlClasses = []

    if (node.type === 'SourceUnit') {
        node.children.forEach((childNode) => {
            if (childNode.type === 'ContractDefinition') {
                let umlClass = new UmlClass({
                    name: childNode.name,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                })

                parseContractDefinition(childNode, umlClass)

                debug(`Added contract ${childNode.name}`)

                umlClasses.push(umlClass)
            } else if (childNode.type === 'StructDefinition') {
                debug(`Adding file level struct ${childNode.name}`)

                let umlClass = new UmlClass({
                    name: childNode.name,
                    stereotype: ClassStereotype.Struct,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                })

                parseStructDefinition(childNode, umlClass)

                debug(`Added struct ${umlClass.name}`)

                umlClasses.push(umlClass)
            } else if (childNode.type === 'EnumDefinition') {
                debug(`Adding file level enum ${childNode.name}`)

                let umlClass = new UmlClass({
                    name: childNode.name,
                    stereotype: ClassStereotype.Enum,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                })

                debug(`Added enum ${umlClass.name}`)

                parseEnumDefinition(childNode, umlClass)

                umlClasses.push(umlClass)
            } else if (childNode.type === 'ImportDirective') {
                const codeFolder = path.dirname(relativePath)
                if (filesystem) {
                    // resolve the imported file from the folder sol2uml was run against
                    try {
                        const importPath = require.resolve(childNode.path, {
                            paths: [codeFolder],
                        })
                        const newImport = {
                            absolutePath: importPath,
                            classNames: childNode.symbolAliases
                                ? childNode.symbolAliases.map((alias) => {
                                      return {
                                          className: alias[0],
                                          alias: alias[1],
                                      }
                                  })
                                : [],
                        }
                        debug(
                            `Added filesystem import ${newImport.absolutePath} with class names ${newImport.classNames}`
                        )
                        imports.push(newImport)
                    } catch (err) {
                        debug(
                            `Failed to resolve import ${childNode.path} from file ${relativePath}`
                        )
                    }
                } else {
                    // this has come from Etherscan
                    const remappedFile = renameFile(childNode.path, remappings)
                    const importPath =
                        remappedFile[0] === '.'
                            ? // Use Linux paths, not Windows paths, to resolve Etherscan files
                              posix.join(codeFolder.toString(), remappedFile)
                            : remappedFile
                    debug(
                        `codeFolder ${codeFolder} childNode.path ${childNode.path} remapped to ${remappedFile}`
                    )
                    const newImport = {
                        absolutePath: importPath,
                        classNames: childNode.symbolAliases
                            ? childNode.symbolAliases.map((alias) => {
                                  return {
                                      className: alias[0],
                                      alias: alias[1],
                                  }
                              })
                            : [],
                    }
                    debug(
                        `Added Etherscan import ${newImport.absolutePath} with:`
                    )
                    newImport.classNames.forEach((className) => {
                        debug(
                            `\t alias ${className.className}, name ${className.className}`
                        )
                    })
                    imports.push(newImport)
                }
            } else if (childNode.type === 'FileLevelConstant') {
                debug(`Adding file level constant ${childNode.name}`)

                const [type, attributeType] = parseTypeName(childNode.typeName)
                const umlClass = new UmlClass({
                    name: childNode.name,
                    stereotype: ClassStereotype.Constant,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                    attributes: [
                        {
                            name: childNode.name,
                            type,
                            attributeType,
                        },
                    ],
                })
                if (childNode?.initialValue?.type === 'NumberLiteral') {
                    umlClass.constants.push({
                        name: childNode.name,
                        value: parseInt(childNode.initialValue.number),
                    })
                }
                // TODO handle expressions. eg N_COINS * 2

                umlClasses.push(umlClass)
            } else if (childNode.type !== 'PragmaDirective') {
                debug(
                    `node type "${childNode.type}" not parsed in ${relativePath}`
                )
            }
        })
    } else {
        throw new Error(`AST node not of type SourceUnit`)
    }

    if (umlClasses.length > 0) {
        umlClasses.forEach((umlClass) => {
            umlClass.imports = imports
        })
    } else {
        const importUmlClass = new UmlClass({
            name: 'Import',
            stereotype: ClassStereotype.Import,
            absolutePath: filesystem
                ? path.resolve(relativePath) // resolve the absolute path
                : relativePath, // from Etherscan so don't resolve
            relativePath,
        })
        importUmlClass.imports = imports
        umlClasses = [importUmlClass]
    }

    return umlClasses
}

/**
 * Parse struct definition for UML attributes and associations.
 * @param node defined in ASTNode as `StructDefinition`
 * @param umlClass that has struct attributes and associations added. This parameter is mutated.
 */
function parseStructDefinition(node: StructDefinition, umlClass: UmlClass) {
    node.members.forEach((member: VariableDeclaration) => {
        const [type, attributeType] = parseTypeName(member.typeName)
        umlClass.attributes.push({
            name: member.name,
            type,
            attributeType,
        })
    })

    // Recursively parse struct members for associations
    addAssociations(node.members, umlClass)
}

/**
 * Parse enum definition for UML attributes and associations.
 * @param node defined in ASTNode as `EnumDefinition`
 * @param umlClass that has enum attributes and associations added. This parameter is mutated.
 */
function parseEnumDefinition(node: EnumDefinition, umlClass: UmlClass) {
    let index = 0
    node.members.forEach((member: EnumValue) => {
        umlClass.attributes.push({
            name: member.name,
            type: (index++).toString(),
        })
    })

    // Recursively parse struct members for associations
    addAssociations(node.members, umlClass)
}

/**
 * Parse contract definition for UML attributes, operations and associations.
 * @param node defined in ASTNode as `ContractDefinition`
 * @param umlClass that has attributes, operations and associations added. This parameter is mutated.
 */
function parseContractDefinition(node: ContractDefinition, umlClass: UmlClass) {
    umlClass.stereotype = parseContractKind(node.kind)

    // For each base contract
    node.baseContracts.forEach((baseClass) => {
        // Add a realization association
        umlClass.addAssociation({
            referenceType: ReferenceType.Storage,
            targetUmlClassName: baseClass.baseName.namePath,
            realization: true,
        })
    })

    // For each sub node
    node.subNodes.forEach((subNode) => {
        if (isStateVariableDeclaration(subNode)) {
            subNode.variables.forEach(
                (variable: StateVariableDeclarationVariable) => {
                    const [type, attributeType] = parseTypeName(
                        variable.typeName
                    )
                    const valueStore =
                        variable.isDeclaredConst || variable.isImmutable

                    umlClass.attributes.push({
                        visibility: parseVisibility(variable.visibility),
                        name: variable.name,
                        type,
                        attributeType,
                        compiled: valueStore,
                    })

                    // Is the variable a constant that could be used in declaring fixed sized arrays
                    if (variable.isDeclaredConst) {
                        if (variable?.expression?.type === 'NumberLiteral') {
                            umlClass.constants.push({
                                name: variable.name,
                                value: parseInt(variable.expression.number),
                            })
                        }
                        // TODO handle expressions. eg N_COINS * 2
                    }
                }
            )

            // Recursively parse variables for associations
            addAssociations(subNode.variables, umlClass)
        } else if (isUsingForDeclaration(subNode)) {
            // Add association to library contract
            umlClass.addAssociation({
                referenceType: ReferenceType.Memory,
                targetUmlClassName: (<UsingForDeclaration>subNode).libraryName,
            })
        } else if (isFunctionDefinition(subNode)) {
            if (subNode.isConstructor) {
                umlClass.operators.push({
                    name: 'constructor',
                    stereotype: OperatorStereotype.None,
                    parameters: parseParameters(subNode.parameters),
                })
            }
            // If a fallback function
            else if (subNode.name === '') {
                umlClass.operators.push({
                    name: '',
                    stereotype: OperatorStereotype.Fallback,
                    parameters: parseParameters(subNode.parameters),
                    stateMutability: subNode.stateMutability,
                })
            } else {
                let stereotype = OperatorStereotype.None

                if (subNode.body === null) {
                    stereotype = OperatorStereotype.Abstract
                } else if (subNode.stateMutability === 'payable') {
                    stereotype = OperatorStereotype.Payable
                }

                umlClass.operators.push({
                    visibility: parseVisibility(subNode.visibility),
                    name: subNode.name,
                    stereotype,
                    parameters: parseParameters(subNode.parameters),
                    returnParameters: parseParameters(subNode.returnParameters),
                    modifiers: subNode.modifiers.map((m) => m.name),
                })
            }

            // Recursively parse function parameters for associations
            addAssociations(subNode.parameters, umlClass)
            if (subNode.returnParameters) {
                addAssociations(subNode.returnParameters, umlClass)
            }

            // If no body to the function, it must be either an Interface or Abstract
            if (subNode.body === null) {
                if (umlClass.stereotype !== ClassStereotype.Interface) {
                    // If not Interface, it must be Abstract
                    umlClass.stereotype = ClassStereotype.Abstract
                }
            } else {
                // Recursively parse function statements for associations
                addAssociations(subNode.body.statements as ASTNode[], umlClass)
            }
        } else if (isModifierDefinition(subNode)) {
            umlClass.operators.push({
                stereotype: OperatorStereotype.Modifier,
                name: subNode.name,
                parameters: parseParameters(subNode.parameters),
            })

            if (subNode.body && subNode.body.statements) {
                // Recursively parse modifier statements for associations
                addAssociations(subNode.body.statements as ASTNode[], umlClass)
            }
        } else if (isEventDefinition(subNode)) {
            umlClass.operators.push({
                stereotype: OperatorStereotype.Event,
                name: subNode.name,
                parameters: parseParameters(subNode.parameters),
            })

            // Recursively parse event parameters for associations
            addAssociations(subNode.parameters, umlClass)
        } else if (isStructDefinition(subNode)) {
            const structClass = new UmlClass({
                name: subNode.name,
                absolutePath: umlClass.absolutePath,
                relativePath: umlClass.relativePath,
                stereotype: ClassStereotype.Struct,
            })
            parseStructDefinition(subNode, structClass)
            umlClasses.push(structClass)

            // list as contract level struct
            umlClass.structs.push(structClass.id)
        } else if (isEnumDefinition(subNode)) {
            const enumClass = new UmlClass({
                name: subNode.name,
                absolutePath: umlClass.absolutePath,
                relativePath: umlClass.relativePath,
                stereotype: ClassStereotype.Enum,
            })
            parseEnumDefinition(subNode, enumClass)
            umlClasses.push(enumClass)

            // list as contract level enum
            umlClass.enums.push(enumClass.id)
        }
    })
}

/**
 * Recursively parse a list of ASTNodes for UML associations
 * @param nodes array of parser output of type ASTNode
 * @param umlClass that has associations added of type `Association`. This parameter is mutated.
 */
function addAssociations(
    nodes: (ASTNode & { isStateVar?: boolean })[],
    umlClass: UmlClass
) {
    if (!nodes || !Array.isArray(nodes)) {
        debug(
            'Warning - can not recursively parse AST nodes for associations. Invalid nodes array'
        )
        return
    }

    for (const node of nodes) {
        // Some variables can be null. eg var (lad,,,) = tub.cups(cup);
        if (node === null) {
            break
        }

        // If state variable then mark as a Storage reference, else Memory
        const referenceType = node.isStateVar!
            ? ReferenceType.Storage
            : ReferenceType.Memory

        // Recursively parse sub nodes that can has variable declarations
        switch (node.type) {
            case 'VariableDeclaration':
                if (!node.typeName) {
                    break
                }
                if (node.typeName.type === 'UserDefinedTypeName') {
                    // Library references can have a Library dot variable notation. eg Set.Data
                    const { umlClassName, structOrEnum } = parseClassName(
                        node.typeName.namePath
                    )
                    umlClass.addAssociation({
                        referenceType,
                        targetUmlClassName: umlClassName,
                    })
                    if (structOrEnum) {
                        umlClass.addAssociation({
                            referenceType,
                            targetUmlClassName: structOrEnum,
                        })
                    }
                } else if (node.typeName.type === 'Mapping') {
                    addAssociations([node.typeName.keyType], umlClass)
                    addAssociations(
                        [
                            {
                                ...node.typeName.valueType,
                                isStateVar: node.isStateVar,
                            },
                        ],
                        umlClass
                    )
                    // Array of user defined types
                } else if (node.typeName.type == 'ArrayTypeName') {
                    if (
                        node.typeName.baseTypeName.type ===
                        'UserDefinedTypeName'
                    ) {
                        const { umlClassName } = parseClassName(
                            node.typeName.baseTypeName.namePath
                        )
                        umlClass.addAssociation({
                            referenceType,
                            targetUmlClassName: umlClassName,
                        })
                    } else if (node.typeName.length?.type === 'Identifier') {
                        const { umlClassName } = parseClassName(
                            node.typeName.length.name
                        )
                        umlClass.addAssociation({
                            referenceType,
                            targetUmlClassName: umlClassName,
                        })
                    }
                }
                break
            case 'UserDefinedTypeName':
                umlClass.addAssociation({
                    referenceType: referenceType,
                    targetUmlClassName: node.namePath,
                })
                break
            case 'Block':
                addAssociations(node.statements as ASTNode[], umlClass)
                break
            case 'StateVariableDeclaration':
            case 'VariableDeclarationStatement':
                addAssociations(node.variables as ASTNode[], umlClass)
                parseExpression(node.initialValue, umlClass)
                break
            case 'EmitStatement':
                addAssociations(node.eventCall.arguments as ASTNode[], umlClass)
                parseExpression(node.eventCall.expression, umlClass)
                break
            case 'FunctionCall':
                addAssociations(node.arguments as ASTNode[], umlClass)
                parseExpression(node.expression, umlClass)
                break
            case 'ForStatement':
                if ('statements' in node.body) {
                    addAssociations(node.body.statements as ASTNode[], umlClass)
                }
                parseExpression(node.conditionExpression, umlClass)
                parseExpression(node.loopExpression.expression, umlClass)
                break
            case 'WhileStatement':
                if ('statements' in node.body) {
                    addAssociations(node.body.statements as ASTNode[], umlClass)
                }
                break
            case 'DoWhileStatement':
                if ('statements' in node.body) {
                    addAssociations(node.body.statements as ASTNode[], umlClass)
                }
                parseExpression(node.condition, umlClass)
                break
            case 'ReturnStatement':
            case 'ExpressionStatement':
                parseExpression(node.expression, umlClass)
                break
            case 'IfStatement':
                if (node.trueBody) {
                    if ('statements' in node.trueBody) {
                        addAssociations(
                            node.trueBody.statements as ASTNode[],
                            umlClass
                        )
                    }
                    if ('expression' in node.trueBody) {
                        parseExpression(node.trueBody.expression, umlClass)
                    }
                }
                if (node.falseBody) {
                    if ('statements' in node.falseBody) {
                        addAssociations(
                            node.falseBody.statements as ASTNode[],
                            umlClass
                        )
                    }
                    if ('expression' in node.falseBody) {
                        parseExpression(node.falseBody.expression, umlClass)
                    }
                }

                parseExpression(node.condition, umlClass)
                break
            default:
                break
        }
    }
}

/**
 * Recursively parse an expression to add UML associations to other contracts, constants, enums or structs.
 * @param expression defined in ASTNode as `Expression`
 * @param umlClass that has associations added of type `Association`. This parameter is mutated.
 */
function parseExpression(expression: Expression, umlClass: UmlClass) {
    if (!expression || !expression.type) {
        return
    }
    if (expression.type === 'BinaryOperation') {
        parseExpression(expression.left, umlClass)
        parseExpression(expression.right, umlClass)
    } else if (expression.type === 'FunctionCall') {
        parseExpression(expression.expression, umlClass)
        expression.arguments.forEach((arg) => {
            parseExpression(arg, umlClass)
        })
    } else if (expression.type === 'IndexAccess') {
        parseExpression(expression.base, umlClass)
        parseExpression(expression.index, umlClass)
    } else if (expression.type === 'TupleExpression') {
        expression.components.forEach((component) => {
            parseExpression(component as Expression, umlClass)
        })
    } else if (expression.type === 'MemberAccess') {
        parseExpression(expression.expression, umlClass)
    } else if (expression.type === 'Conditional') {
        addAssociations([expression.trueExpression], umlClass)
        addAssociations([expression.falseExpression], umlClass)
    } else if (expression.type === 'Identifier') {
        umlClass.addAssociation({
            referenceType: ReferenceType.Memory,
            targetUmlClassName: expression.name,
        })
    } else if (expression.type === 'NewExpression') {
        addAssociations([expression.typeName], umlClass)
    } else if (
        expression.type === 'UnaryOperation' &&
        expression.subExpression
    ) {
        parseExpression(expression.subExpression, umlClass)
    }
}

/**
 * Convert user defined type to class name and struct or enum.
 * eg `Set.Data` has class `Set` and struct or enum of `Data`
 * @param rawClassName can be `TypeName` properties `namePath`, `length.name` or `baseTypeName.namePath` as defined in the ASTNode
 * @return object with `umlClassName` and `structOrEnum` of type string
 */
function parseClassName(rawClassName: string): {
    umlClassName: string
    structOrEnum: string
} {
    if (
        !rawClassName ||
        typeof rawClassName !== 'string' ||
        rawClassName.length === 0
    ) {
        return {
            umlClassName: '',
            structOrEnum: rawClassName,
        }
    }

    // Split the name on dot
    const splitUmlClassName = rawClassName.split('.')
    return {
        umlClassName: splitUmlClassName[0],
        structOrEnum: splitUmlClassName[1],
    }
}

/**
 * Converts the contract visibility to attribute or operator visibility of type `Visibility`
 * @param params defined in ASTNode as VariableDeclaration.visibility, FunctionDefinition.visibility or FunctionTypeName.visibility
 * @return visibility `Visibility` enum used by the `visibility` property on UML `Attribute` or `Operator`
 */
function parseVisibility(visibility: string): Visibility {
    switch (visibility) {
        case 'default':
            return Visibility.Public
        case 'public':
            return Visibility.Public
        case 'external':
            return Visibility.External
        case 'internal':
            return Visibility.Internal
        case 'private':
            return Visibility.Private
        default:
            throw Error(
                `Invalid visibility ${visibility}. Was not public, external, internal or private`
            )
    }
}

/**
 * Recursively converts contract variables to UMLClass attribute types.
 * Types can be standard Solidity types, arrays, mappings or user defined types like structs and enums.
 * @param typeName defined in ASTNode as `TypeName`
 * @return attributeTypes array of type string and `AttributeType`
 */
function parseTypeName(typeName: TypeName): [string, AttributeType] {
    switch (typeName.type) {
        case 'ElementaryTypeName':
            return [typeName.name, AttributeType.Elementary]
        case 'UserDefinedTypeName':
            return [typeName.namePath, AttributeType.UserDefined]
        case 'FunctionTypeName':
            // TODO add params and return type
            return [typeName.type + '\\(\\)', AttributeType.Function]
        case 'ArrayTypeName':
            const [arrayElementType] = parseTypeName(typeName.baseTypeName)
            let length: string = ''
            if (Number.isInteger(typeName.length)) {
                length = typeName.length.toString()
            } else if (typeName.length?.type === 'NumberLiteral') {
                length = typeName.length.number
            } else if (typeName.length?.type === 'Identifier') {
                length = typeName.length.name
            }
            // TODO does not currently handle Expression types like BinaryOperation
            return [arrayElementType + '[' + length + ']', AttributeType.Array]
        case 'Mapping':
            const key =
                (<ElementaryTypeName>typeName.keyType)?.name ||
                (<UserDefinedTypeName>typeName.keyType)?.namePath
            const [valueType] = parseTypeName(typeName.valueType)
            return [
                'mapping\\(' + key + '=\\>' + valueType + '\\)',
                AttributeType.Mapping,
            ]
        default:
            throw Error(`Invalid typeName ${typeName}`)
    }
}

/**
 * Converts the contract params to `Operator` properties `parameters` or `returnParameters`
 * @param params defined in ASTNode as `VariableDeclaration`
 * @return parameters or `returnParameters` of the `Operator` of type `Parameter`
 */
function parseParameters(params: readonly VariableDeclaration[]): Parameter[] {
    if (!params || !params) {
        return []
    }

    let parameters: Parameter[] = []

    for (const param of params) {
        const [type] = parseTypeName(param.typeName)
        parameters.push({
            name: param.name,
            type,
        })
    }

    return parameters
}

/**
 * Converts the contract `kind` to `UMLClass` stereotype
 * @param kind defined in ASTNode as ContractDefinition.kind
 * @return stereotype of the `UMLClass` with type `ClassStereotype
 */
function parseContractKind(kind: string): ClassStereotype {
    switch (kind) {
        case 'contract':
            return ClassStereotype.None
        case 'interface':
            return ClassStereotype.Interface
        case 'library':
            return ClassStereotype.Library
        case 'abstract':
            return ClassStereotype.Abstract
        default:
            throw Error(`Invalid kind ${kind}`)
    }
}

/**
 * Used to rename import file names. For example
 * @openzeppelin/contracts/token/ERC721/IERC721Receiver.sol
 * to
 * lib/openzeppelin-contracts/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol
 * @param fileName file name in the Solidity code
 * @param mappings an array of remappings from Etherscan's settings
 */
export const renameFile = (fileName: string, mappings: Remapping[]): string => {
    let renamedFile = fileName
    for (const mapping of mappings) {
        if (renamedFile.match(mapping.from)) {
            const beforeFileName = renamedFile
            renamedFile = renamedFile.replace(mapping.from, mapping.to)
            debug(`remapping ${beforeFileName} to ${renamedFile}`)
            break
        }
    }
    return renamedFile
}
