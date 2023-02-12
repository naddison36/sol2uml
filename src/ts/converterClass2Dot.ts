// Returns a string of the UML Class in Graphviz's dot format
import {
    Attribute,
    ClassStereotype,
    Operator,
    OperatorStereotype,
    Parameter,
    UmlClass,
    Visibility,
} from './umlClass'
import { isAddress } from './utils/regEx'

export interface ClassOptions {
    hideConstants?: boolean
    hideVariables?: boolean
    hideFunctions?: boolean
    hideModifiers?: boolean
    hideEvents?: boolean
    hideStructs?: boolean
    hideEnums?: boolean
    hideLibraries?: boolean
    hideInterfaces?: boolean
    hidePrivates?: boolean
    hideAbstracts?: boolean
    hideFilename?: boolean
    hideSourceContract?: boolean
    backColor?: string
    shapeColor?: string
    fillColor?: string
    textColor?: string
}

export const convertClass2Dot = (
    umlClass: UmlClass,
    options: ClassOptions = {}
): string => {
    // do not include library, interface, abstracts, struct or enum classes if hidden
    if (
        umlClass.stereotype === ClassStereotype.Import ||
        (options.hideLibraries &&
            umlClass.stereotype === ClassStereotype.Library) ||
        (options.hideInterfaces &&
            umlClass.stereotype === ClassStereotype.Interface) ||
        (options.hideAbstracts &&
            umlClass.stereotype === ClassStereotype.Abstract) ||
        (options.hideStructs &&
            umlClass.stereotype === ClassStereotype.Struct) ||
        (options.hideEnums && umlClass.stereotype === ClassStereotype.Enum) ||
        (options.hideConstants &&
            umlClass.stereotype === ClassStereotype.Constant)
    ) {
        return ''
    }

    let dotString = `\n${umlClass.id} [label="{${dotClassTitle(
        umlClass,
        options
    )}`

    // Add attributes
    if (!options.hideVariables) {
        dotString += dotAttributeVisibilities(umlClass, options)
    }

    // Add operators
    if (!options.hideFunctions) {
        dotString += dotOperatorVisibilities(umlClass, options)
    }

    dotString += '}"]'

    return dotString
}

const dotClassTitle = (
    umlClass: UmlClass,
    options: { hideFilename?: boolean } = {}
): string => {
    let stereoName: string = ''
    const relativePath =
        options.hideFilename || isAddress(umlClass.relativePath)
            ? ''
            : `\\n${umlClass.relativePath}`
    switch (umlClass.stereotype) {
        case ClassStereotype.Abstract:
            stereoName = 'Abstract'
            break
        case ClassStereotype.Interface:
            stereoName = 'Interface'
            break
        case ClassStereotype.Library:
            stereoName = 'Library'
            break
        case ClassStereotype.Struct:
            stereoName = 'Struct'
            break
        case ClassStereotype.Enum:
            stereoName = 'Enum'
            break
        case ClassStereotype.Constant:
            stereoName = 'Constant'
            break
        default:
            // Contract or undefined stereotype will just return the UmlClass name
            return `${umlClass.name}${relativePath}`
    }

    return `\\<\\<${stereoName}\\>\\>\\n${umlClass.name}${relativePath}`
}

const dotAttributeVisibilities = (
    umlClass: UmlClass,
    options: { hidePrivates?: boolean; hideSourceContract?: boolean }
): string => {
    if (umlClass.attributes.length === 0) return ''

    let dotString = '| '
    // if a struct, enum or constant then no visibility group
    if (
        umlClass.stereotype === ClassStereotype.Struct ||
        umlClass.stereotype === ClassStereotype.Enum ||
        umlClass.stereotype === ClassStereotype.Constant
    ) {
        return (
            dotString +
            dotAttributes(umlClass.attributes, options, undefined, false)
        )
    }

    // For each visibility group
    for (const vizGroup of ['Private', 'Internal', 'External', 'Public']) {
        const attributes: Attribute[] = []

        // For each attribute of te UML Class
        for (const attribute of umlClass.attributes) {
            if (
                !options.hidePrivates &&
                vizGroup === 'Private' &&
                attribute.visibility === Visibility.Private
            ) {
                attributes.push(attribute)
            } else if (
                !options.hidePrivates &&
                vizGroup === 'Internal' &&
                attribute.visibility === Visibility.Internal
            ) {
                attributes.push(attribute)
            } else if (
                vizGroup === 'External' &&
                attribute.visibility === Visibility.External
            ) {
                attributes.push(attribute)
            }
            // Rest are Public, None or undefined visibilities
            else if (
                vizGroup === 'Public' &&
                (attribute.visibility === Visibility.Public ||
                    attribute.visibility === Visibility.None ||
                    !attribute.visibility)
            ) {
                attributes.push(attribute)
            }
        }

        dotString += dotAttributes(attributes, options, vizGroup)
    }

    return dotString
}

const dotAttributes = (
    attributes: Attribute[],
    options: { hideSourceContract?: boolean },
    vizGroup?: string,
    indent = true
): string => {
    if (!attributes || attributes.length === 0) {
        return ''
    }
    const indentString = indent ? '\\ \\ \\ ' : ''

    let dotString = vizGroup ? vizGroup + ':\\l' : ''

    // for each attribute
    attributes.forEach((attribute) => {
        const sourceContract =
            attribute.sourceContract && !options.hideSourceContract
                ? ` \\<\\<${attribute.sourceContract}\\>\\>`
                : ''
        dotString += `${indentString}${attribute.name}: ${attribute.type}${sourceContract}\\l`
    })

    return dotString
}

const dotOperatorVisibilities = (
    umlClass: UmlClass,
    options: {
        hidePrivates?: boolean
        hideModifiers?: boolean
        hideEvents?: boolean
    }
): string => {
    if (umlClass.operators.length === 0) return ''

    let dotString = '| '

    // For each visibility group
    for (const vizGroup of ['Private', 'Internal', 'External', 'Public']) {
        const operators: Operator[] = []

        // For each attribute of te UML Class
        for (const operator of umlClass.operators) {
            if (
                !options.hidePrivates &&
                vizGroup === 'Private' &&
                operator.visibility === Visibility.Private
            ) {
                operators.push(operator)
            } else if (
                !options.hidePrivates &&
                vizGroup === 'Internal' &&
                operator.visibility === Visibility.Internal
            ) {
                operators.push(operator)
            } else if (
                vizGroup === 'External' &&
                operator.visibility === Visibility.External
            ) {
                operators.push(operator)
            }
            // Rest are Public, None or undefined visibilities
            else if (
                vizGroup === 'Public' &&
                (operator.visibility === Visibility.Public ||
                    operator.visibility === Visibility.None ||
                    !operator.visibility)
            ) {
                operators.push(operator)
            }
        }

        dotString += dotOperators(umlClass, vizGroup, operators, options)
    }

    return dotString
}

const dotOperators = (
    umlClass: UmlClass,
    vizGroup: string,
    operators: Operator[],
    options: {
        hideModifiers?: boolean
        hideEvents?: boolean
        hideSourceContract?: boolean
    }
): string => {
    // Skip if there are no operators
    if (!operators || operators.length === 0) {
        return ''
    }

    let dotString = vizGroup + ':\\l'

    // Sort the operators by stereotypes
    const operatorsSortedByStereotype = operators.sort((a, b) => {
        return b.stereotype - a.stereotype
    })
    // Filter out any modifiers or events if options are flagged to hide them
    let operatorsFiltered = operatorsSortedByStereotype.filter(
        (o) =>
            !(
                (options.hideModifiers === true &&
                    o.stereotype === OperatorStereotype.Modifier) ||
                (options.hideEvents === true &&
                    o.stereotype === OperatorStereotype.Event)
            )
    )

    for (const operator of operatorsFiltered) {
        dotString += '\\ \\ \\ \\ '

        if (operator.stereotype > 0) {
            dotString += dotOperatorStereotype(umlClass, operator.stereotype)
        }

        dotString += operator.name

        dotString += dotParameters(operator.parameters)

        if (operator.returnParameters?.length > 0) {
            dotString += ': ' + dotParameters(operator.returnParameters, true)
        }

        if (options.hideModifiers === false && operator.modifiers?.length > 0) {
            dotString += ` \\<\\<${operator.modifiers.join(', ')}\\>\\>`
        }

        if (operator.sourceContract && !options.hideSourceContract)
            dotString += ` \\<\\<${operator.sourceContract}\\>\\>`

        dotString += '\\l'
    }

    return dotString
}

const dotOperatorStereotype = (
    umlClass: UmlClass,
    operatorStereotype: OperatorStereotype
): string => {
    let dotString = ''

    switch (operatorStereotype) {
        case OperatorStereotype.Event:
            dotString += '\\<\\<event\\>\\>'
            break
        case OperatorStereotype.Fallback:
            dotString += '\\<\\<fallback\\>\\>'
            break
        case OperatorStereotype.Modifier:
            dotString += '\\<\\<modifier\\>\\>'
            break
        case OperatorStereotype.Abstract:
            if (umlClass.stereotype === ClassStereotype.Abstract) {
                dotString += '\\<\\<abstract\\>\\>'
            }
            break
        case OperatorStereotype.Payable:
            dotString += '\\<\\<payable\\>\\>'
            break
        default:
            break
    }

    return dotString + ' '
}

const dotParameters = (
    parameters: Parameter[],
    returnParams: boolean = false
): string => {
    if (parameters.length == 1 && !parameters[0].name) {
        if (returnParams) {
            return parameters[0].type
        } else {
            return `(${parameters[0].type})`
        }
    }

    let dotString = '('
    let paramCount = 0

    for (const parameter of parameters) {
        // The parameter name can be null in return parameters
        if (parameter.name === null) {
            dotString += parameter.type
        } else {
            dotString += parameter.name + ': ' + parameter.type
        }

        // If not the last parameter
        if (++paramCount < parameters.length) {
            dotString += ', '
        }
    }

    return dotString + ')'
}
