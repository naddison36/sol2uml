"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertClass2Dot = void 0;
// Returns a string of the UML Class in Graphviz's dot format
const umlClass_1 = require("./umlClass");
const regEx_1 = require("./utils/regEx");
const convertClass2Dot = (umlClass, options = {}) => {
    // do not include library, interface, abstracts, struct or enum classes if hidden
    if (umlClass.stereotype === umlClass_1.ClassStereotype.Import ||
        (options.hideLibraries &&
            umlClass.stereotype === umlClass_1.ClassStereotype.Library) ||
        (options.hideInterfaces &&
            umlClass.stereotype === umlClass_1.ClassStereotype.Interface) ||
        (options.hideAbstracts &&
            umlClass.stereotype === umlClass_1.ClassStereotype.Abstract) ||
        (options.hideStructs &&
            umlClass.stereotype === umlClass_1.ClassStereotype.Struct) ||
        (options.hideEnums && umlClass.stereotype === umlClass_1.ClassStereotype.Enum) ||
        (options.hideConstants &&
            umlClass.stereotype === umlClass_1.ClassStereotype.Constant)) {
        return '';
    }
    let dotString = `\n${umlClass.id} [label="{${dotClassTitle(umlClass, options)}`;
    // Add attributes
    if (!options.hideVariables) {
        dotString += dotAttributeVisibilities(umlClass, options);
    }
    // Add operators
    if (!options.hideFunctions) {
        dotString += dotOperatorVisibilities(umlClass, options);
    }
    dotString += '}"]';
    return dotString;
};
exports.convertClass2Dot = convertClass2Dot;
const dotClassTitle = (umlClass, options = {}) => {
    let stereoName = '';
    const relativePath = options.hideFilename || (0, regEx_1.isAddress)(umlClass.relativePath)
        ? ''
        : `\\n${umlClass.relativePath}`;
    switch (umlClass.stereotype) {
        case umlClass_1.ClassStereotype.Abstract:
            stereoName = 'Abstract';
            break;
        case umlClass_1.ClassStereotype.Interface:
            stereoName = 'Interface';
            break;
        case umlClass_1.ClassStereotype.Library:
            stereoName = 'Library';
            break;
        case umlClass_1.ClassStereotype.Struct:
            stereoName = 'Struct';
            break;
        case umlClass_1.ClassStereotype.Enum:
            stereoName = 'Enum';
            break;
        case umlClass_1.ClassStereotype.Constant:
            stereoName = 'Constant';
            break;
        default:
            // Contract or undefined stereotype will just return the UmlClass name
            return `${umlClass.name}${relativePath}`;
    }
    return `\\<\\<${stereoName}\\>\\>\\n${umlClass.name}${relativePath}`;
};
const dotAttributeVisibilities = (umlClass, options) => {
    if (umlClass.attributes.length === 0)
        return '';
    let dotString = '| ';
    // if a struct, enum or constant then no visibility group
    if (umlClass.stereotype === umlClass_1.ClassStereotype.Struct ||
        umlClass.stereotype === umlClass_1.ClassStereotype.Enum ||
        umlClass.stereotype === umlClass_1.ClassStereotype.Constant) {
        return (dotString +
            dotAttributes(umlClass.attributes, options, undefined, false));
    }
    // For each visibility group
    for (const vizGroup of ['Private', 'Internal', 'External', 'Public']) {
        const attributes = [];
        // For each attribute of te UML Class
        for (const attribute of umlClass.attributes) {
            if (!options.hidePrivates &&
                vizGroup === 'Private' &&
                attribute.visibility === umlClass_1.Visibility.Private) {
                attributes.push(attribute);
            }
            else if (!options.hidePrivates &&
                vizGroup === 'Internal' &&
                attribute.visibility === umlClass_1.Visibility.Internal) {
                attributes.push(attribute);
            }
            else if (vizGroup === 'External' &&
                attribute.visibility === umlClass_1.Visibility.External) {
                attributes.push(attribute);
            }
            // Rest are Public, None or undefined visibilities
            else if (vizGroup === 'Public' &&
                (attribute.visibility === umlClass_1.Visibility.Public ||
                    attribute.visibility === umlClass_1.Visibility.None ||
                    !attribute.visibility)) {
                attributes.push(attribute);
            }
        }
        dotString += dotAttributes(attributes, options, vizGroup);
    }
    return dotString;
};
const dotAttributes = (attributes, options, vizGroup, indent = true) => {
    if (!attributes || attributes.length === 0) {
        return '';
    }
    const indentString = indent ? '\\ \\ \\ ' : '';
    let dotString = vizGroup ? vizGroup + ':\\l' : '';
    // for each attribute
    attributes.forEach((attribute) => {
        const sourceContract = attribute.sourceContract && !options.hideSourceContract
            ? ` \\<\\<${attribute.sourceContract}\\>\\>`
            : '';
        dotString += `${indentString}${attribute.name}: ${attribute.type}${sourceContract}\\l`;
    });
    return dotString;
};
const dotOperatorVisibilities = (umlClass, options) => {
    if (umlClass.operators.length === 0)
        return '';
    let dotString = '| ';
    // For each visibility group
    for (const vizGroup of ['Private', 'Internal', 'External', 'Public']) {
        const operators = [];
        // For each attribute of te UML Class
        for (const operator of umlClass.operators) {
            if (!options.hidePrivates &&
                vizGroup === 'Private' &&
                operator.visibility === umlClass_1.Visibility.Private) {
                operators.push(operator);
            }
            else if (!options.hidePrivates &&
                vizGroup === 'Internal' &&
                operator.visibility === umlClass_1.Visibility.Internal) {
                operators.push(operator);
            }
            else if (vizGroup === 'External' &&
                operator.visibility === umlClass_1.Visibility.External) {
                operators.push(operator);
            }
            // Rest are Public, None or undefined visibilities
            else if (vizGroup === 'Public' &&
                (operator.visibility === umlClass_1.Visibility.Public ||
                    operator.visibility === umlClass_1.Visibility.None ||
                    !operator.visibility)) {
                operators.push(operator);
            }
        }
        dotString += dotOperators(umlClass, vizGroup, operators, options);
    }
    return dotString;
};
const dotOperators = (umlClass, vizGroup, operators, options) => {
    // Skip if there are no operators
    if (!operators || operators.length === 0) {
        return '';
    }
    let dotString = vizGroup + ':\\l';
    // Sort the operators by stereotypes
    const operatorsSortedByStereotype = operators.sort((a, b) => {
        return b.stereotype - a.stereotype;
    });
    // Filter out any modifiers or events if options are flagged to hide them
    let operatorsFiltered = operatorsSortedByStereotype.filter((o) => !((options.hideModifiers === true &&
        o.stereotype === umlClass_1.OperatorStereotype.Modifier) ||
        (options.hideEvents === true &&
            o.stereotype === umlClass_1.OperatorStereotype.Event)));
    for (const operator of operatorsFiltered) {
        dotString += '\\ \\ \\ \\ ';
        if (operator.stereotype > 0) {
            dotString += dotOperatorStereotype(umlClass, operator.stereotype);
        }
        dotString += operator.name;
        dotString += dotParameters(operator.parameters);
        if (operator.returnParameters?.length > 0) {
            dotString += ': ' + dotParameters(operator.returnParameters, true);
        }
        if (options.hideModifiers === false && operator.modifiers?.length > 0) {
            dotString += ` \\<\\<${operator.modifiers.join(', ')}\\>\\>`;
        }
        if (operator.sourceContract && !options.hideSourceContract)
            dotString += ` \\<\\<${operator.sourceContract}\\>\\>`;
        dotString += '\\l';
    }
    return dotString;
};
const dotOperatorStereotype = (umlClass, operatorStereotype) => {
    let dotString = '';
    switch (operatorStereotype) {
        case umlClass_1.OperatorStereotype.Event:
            dotString += '\\<\\<event\\>\\>';
            break;
        case umlClass_1.OperatorStereotype.Fallback:
            dotString += '\\<\\<fallback\\>\\>';
            break;
        case umlClass_1.OperatorStereotype.Modifier:
            dotString += '\\<\\<modifier\\>\\>';
            break;
        case umlClass_1.OperatorStereotype.Abstract:
            if (umlClass.stereotype === umlClass_1.ClassStereotype.Abstract) {
                dotString += '\\<\\<abstract\\>\\>';
            }
            break;
        case umlClass_1.OperatorStereotype.Payable:
            dotString += '\\<\\<payable\\>\\>';
            break;
        default:
            break;
    }
    return dotString + ' ';
};
const dotParameters = (parameters, returnParams = false) => {
    if (parameters.length == 1 && !parameters[0].name) {
        if (returnParams) {
            return parameters[0].type;
        }
        else {
            return `(${parameters[0].type})`;
        }
    }
    let dotString = '(';
    let paramCount = 0;
    for (const parameter of parameters) {
        // The parameter name can be null in return parameters
        if (parameter.name === null) {
            dotString += parameter.type;
        }
        else {
            dotString += parameter.name + ': ' + parameter.type;
        }
        // If not the last parameter
        if (++paramCount < parameters.length) {
            dotString += ', ';
        }
    }
    return dotString + ')';
};
//# sourceMappingURL=converterClass2Dot.js.map