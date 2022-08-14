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

const debug = require('debug')('sol2uml')

let umlClasses: UmlClass[] = []

export function convertAST2UmlClasses(
    node: ASTNode,
    relativePath: string,
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

                umlClass = parseContractDefinition(umlClass, childNode)

                debug(`Added contract ${childNode.name}`)

                umlClasses.push(umlClass)
            } else if (childNode.type === 'StructDefinition') {
                debug(`Adding struct ${childNode.name}`)

                let umlClass = new UmlClass({
                    name: childNode.name,
                    stereotype: ClassStereotype.Struct,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                })

                umlClass = parseStructDefinition(umlClass, childNode)

                debug(`Added struct ${umlClass.name}`)

                umlClasses.push(umlClass)
            } else if (childNode.type === 'EnumDefinition') {
                debug(`Adding enum ${childNode.name}`)

                let umlClass = new UmlClass({
                    name: childNode.name,
                    stereotype: ClassStereotype.Enum,
                    absolutePath: filesystem
                        ? path.resolve(relativePath) // resolve the absolute path
                        : relativePath, // from Etherscan so don't resolve
                    relativePath,
                })

                debug(`Added enum ${umlClass.name}`)

                umlClass = parseEnumDefinition(umlClass, childNode)

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
                    const importPath =
                        childNode.path[0] === '.'
                            ? // Use Linux paths, not Windows paths, to resolve Etherscan files
                              posix.join(codeFolder.toString(), childNode.path)
                            : childNode.path
                    debug(
                        `codeFolder ${codeFolder} childNode.path ${childNode.path}`
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
                        `Added Etherscan import ${newImport.absolutePath} with class names: ${newImport.classNames}`
                    )
                    imports.push(newImport)
                }
            }
            // TODO add file level constants
        })
    } else {
        throw new Error(`AST node not of type SourceUnit`)
    }

    umlClasses.forEach((umlClass) => {
        umlClass.imports = imports
    })

    return umlClasses
}

function parseStructDefinition(
    umlClass: UmlClass,
    node: StructDefinition
): UmlClass {
    node.members.forEach((member: VariableDeclaration) => {
        const [type, attributeType] = parseTypeName(member.typeName)
        umlClass.attributes.push({
            name: member.name,
            type,
            attributeType,
        })
    })

    // Recursively parse struct members for associations
    umlClass = addAssociations(node.members, umlClass)

    return umlClass
}

function parseEnumDefinition(
    umlClass: UmlClass,
    node: EnumDefinition
): UmlClass {
    let index = 0
    node.members.forEach((member: EnumValue) => {
        umlClass.attributes.push({
            name: member.name,
            type: (index++).toString(),
        })
    })

    // Recursively parse struct members for associations
    umlClass = addAssociations(node.members, umlClass)

    return umlClass
}

function parseContractDefinition(
    umlClass: UmlClass,
    node: ContractDefinition
): UmlClass {
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
            umlClass = addAssociations(subNode.variables, umlClass)
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
                    isPayable: parsePayable(subNode.stateMutability),
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
                })
            }

            // Recursively parse function parameters for associations
            umlClass = addAssociations(subNode.parameters, umlClass)
            if (subNode.returnParameters) {
                umlClass = addAssociations(subNode.returnParameters, umlClass)
            }

            // If no body to the function, it must be either an Interface or Abstract
            if (subNode.body === null) {
                if (umlClass.stereotype !== ClassStereotype.Interface) {
                    // If not Interface, it must be Abstract
                    umlClass.stereotype = ClassStereotype.Abstract
                }
            } else {
                // Recursively parse function statements for associations
                umlClass = addAssociations(
                    subNode.body.statements as ASTNode[],
                    umlClass
                )
            }
        } else if (isModifierDefinition(subNode)) {
            umlClass.operators.push({
                stereotype: OperatorStereotype.Modifier,
                name: subNode.name,
                parameters: parseParameters(subNode.parameters),
            })

            if (subNode.body && subNode.body.statements) {
                // Recursively parse modifier statements for associations
                umlClass = addAssociations(
                    subNode.body.statements as ASTNode[],
                    umlClass
                )
            }
        } else if (isEventDefinition(subNode)) {
            umlClass.operators.push({
                stereotype: OperatorStereotype.Event,
                name: subNode.name,
                parameters: parseParameters(subNode.parameters),
            })

            // Recursively parse event parameters for associations
            umlClass = addAssociations(subNode.parameters, umlClass)
        } else if (isStructDefinition(subNode)) {
            const structClass = new UmlClass({
                name: subNode.name,
                absolutePath: umlClass.absolutePath,
                relativePath: umlClass.relativePath,
                stereotype: ClassStereotype.Struct,
            })
            parseStructDefinition(structClass, subNode)
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
            parseEnumDefinition(enumClass, subNode)
            umlClasses.push(enumClass)

            // list as contract level enum
            umlClass.enums.push(enumClass.id)
        }
    })

    return umlClass
}

// Recursively parse AST nodes for associations
function addAssociations(
    nodes: (ASTNode & { isStateVar?: boolean })[],
    umlClass: UmlClass
): UmlClass {
    if (!nodes || !Array.isArray(nodes)) {
        debug(
            'Warning - can not recursively parse AST nodes for associations. Invalid nodes array'
        )
        return umlClass
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
                    umlClass = addAssociations(
                        [node.typeName.keyType],
                        umlClass
                    )
                    umlClass = addAssociations(
                        [
                            {
                                ...node.typeName.valueType,
                                isStateVar: node.isStateVar,
                            },
                        ],
                        umlClass
                    )
                    // Array of user defined types
                } else if (
                    node.typeName.type == 'ArrayTypeName' &&
                    node.typeName.baseTypeName.type === 'UserDefinedTypeName'
                ) {
                    const { umlClassName } = parseClassName(
                        node.typeName.baseTypeName.namePath
                    )
                    umlClass.addAssociation({
                        referenceType,
                        targetUmlClassName: umlClassName,
                    })
                }
                break
            case 'UserDefinedTypeName':
                umlClass.addAssociation({
                    referenceType: referenceType,
                    targetUmlClassName: node.namePath,
                })
                break
            case 'Block':
                umlClass = addAssociations(
                    node.statements as ASTNode[],
                    umlClass
                )
                break
            case 'StateVariableDeclaration':
            case 'VariableDeclarationStatement':
                umlClass = addAssociations(
                    node.variables as ASTNode[],
                    umlClass
                )
                umlClass = parseExpression(node.initialValue, umlClass)
                break
            case 'ForStatement':
                if ('statements' in node.body) {
                    umlClass = addAssociations(
                        node.body.statements as ASTNode[],
                        umlClass
                    )
                }
                umlClass = parseExpression(node.conditionExpression, umlClass)
                umlClass = parseExpression(
                    node.loopExpression.expression,
                    umlClass
                )
                break
            case 'WhileStatement':
                if ('statements' in node.body) {
                    umlClass = addAssociations(
                        node.body.statements as ASTNode[],
                        umlClass
                    )
                }
                break
            case 'DoWhileStatement':
                if ('statements' in node.body) {
                    umlClass = addAssociations(
                        node.body.statements as ASTNode[],
                        umlClass
                    )
                }
                umlClass = parseExpression(node.condition, umlClass)
                break
            case 'ReturnStatement':
            case 'ExpressionStatement':
                umlClass = parseExpression(node.expression, umlClass)
                break
            case 'IfStatement':
                if (node.trueBody) {
                    if ('statements' in node.trueBody) {
                        umlClass = addAssociations(
                            node.trueBody.statements as ASTNode[],
                            umlClass
                        )
                    }
                    if ('expression' in node.trueBody) {
                        umlClass = parseExpression(
                            node.trueBody.expression,
                            umlClass
                        )
                    }
                }
                if (node.falseBody) {
                    if ('statements' in node.falseBody) {
                        umlClass = addAssociations(
                            node.falseBody.statements as ASTNode[],
                            umlClass
                        )
                    }
                    if ('expression' in node.falseBody) {
                        umlClass = parseExpression(
                            node.falseBody.expression,
                            umlClass
                        )
                    }
                }

                umlClass = parseExpression(node.condition, umlClass)
                break
            default:
                break
        }
    }

    return umlClass
}

function parseExpression(expression: Expression, umlClass: UmlClass): UmlClass {
    if (!expression || !expression.type) {
        return umlClass
    }
    if (expression.type === 'BinaryOperation') {
        umlClass = parseExpression(expression.left, umlClass)
        umlClass = parseExpression(expression.right, umlClass)
    } else if (expression.type === 'FunctionCall') {
        umlClass = parseExpression(expression.expression, umlClass)
        expression.arguments.forEach((arg) => {
            umlClass = parseExpression(arg, umlClass)
        })
    } else if (expression.type === 'IndexAccess') {
        umlClass = parseExpression(expression.base, umlClass)
        umlClass = parseExpression(expression.index, umlClass)
    } else if (expression.type === 'TupleExpression') {
        expression.components.forEach((component) => {
            umlClass = parseExpression(component as Expression, umlClass)
        })
    } else if (expression.type === 'MemberAccess') {
        umlClass = parseExpression(expression.expression, umlClass)
    } else if (expression.type === 'Conditional') {
        umlClass = addAssociations([expression.trueExpression], umlClass)
        umlClass = addAssociations([expression.falseExpression], umlClass)
    } else if (expression.type === 'Identifier') {
        umlClass.addAssociation({
            referenceType: ReferenceType.Memory,
            targetUmlClassName: expression.name,
        })
    } else if (expression.type === 'NewExpression') {
        umlClass = addAssociations([expression.typeName], umlClass)
    } else if (
        expression.type === 'UnaryOperation' &&
        expression.subExpression
    ) {
        umlClass = parseExpression(expression.subExpression, umlClass)
    }

    return umlClass
}

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

function parseParameters(params: VariableDeclaration[]): Parameter[] {
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

function parsePayable(stateMutability: string): boolean {
    return stateMutability === 'payable'
}
