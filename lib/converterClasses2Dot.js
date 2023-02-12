"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAssociationsToDot = exports.convertUmlClasses2Dot = void 0;
const path_1 = require("path");
const converterClass2Dot_1 = require("./converterClass2Dot");
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const debug = require('debug')('sol2uml');
/**
 * Converts UML classes to Graphviz's DOT format.
 * The DOT grammar defines Graphviz nodes, edges, graphs, subgraphs, and clusters http://www.graphviz.org/doc/info/lang.html
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param clusterFolders flag if UML classes are to be clustered into folders their source code was in
 * @param classOptions command line options for the `class` command
 * @return dotString Graphviz's DOT format for defining nodes, edges and clusters.
 */
function convertUmlClasses2Dot(umlClasses, clusterFolders = false, classOptions = {}) {
    let dotString = `
digraph UmlClassDiagram {
rankdir=BT
arrowhead=open
bgcolor="${classOptions.backColor}"
edge [color="${classOptions.shapeColor}"]
node [shape=record, style=filled, color="${classOptions.shapeColor}", fillcolor="${classOptions.fillColor}", fontcolor="${classOptions.textColor}"]`;
    // Sort UML Classes by folder of source file
    const umlClassesSortedByCodePath = sortUmlClassesByCodePath(umlClasses);
    let currentCodeFolder = '';
    for (const umlClass of umlClassesSortedByCodePath) {
        const codeFolder = (0, path_1.dirname)(umlClass.relativePath);
        if (currentCodeFolder !== codeFolder) {
            // Need to close off the last subgraph if not the first
            if (currentCodeFolder != '') {
                dotString += '\n}';
            }
            dotString += `
subgraph ${getSubGraphName(clusterFolders)} {
label="${codeFolder}"`;
            currentCodeFolder = codeFolder;
        }
        dotString += (0, converterClass2Dot_1.convertClass2Dot)(umlClass, classOptions);
    }
    // Need to close off the last subgraph if not the first
    if (currentCodeFolder != '') {
        dotString += '\n}';
    }
    dotString += addAssociationsToDot(umlClasses, classOptions);
    // Need to close off the last the digraph
    dotString += '\n}';
    debug(dotString);
    return dotString;
}
exports.convertUmlClasses2Dot = convertUmlClasses2Dot;
let subGraphCount = 0;
function getSubGraphName(clusterFolders = false) {
    if (clusterFolders) {
        return ` cluster_${subGraphCount++}`;
    }
    return ` graph_${subGraphCount++}`;
}
function sortUmlClassesByCodePath(umlClasses) {
    return umlClasses.sort((a, b) => {
        if (a.relativePath < b.relativePath) {
            return -1;
        }
        if (a.relativePath > b.relativePath) {
            return 1;
        }
        return 0;
    });
}
function addAssociationsToDot(umlClasses, classOptions = {}) {
    let dotString = '';
    // for each class
    for (const sourceUmlClass of umlClasses) {
        if (!classOptions.hideEnums) {
            // for each enum in the class
            sourceUmlClass.enums.forEach((enumId) => {
                // Has the enum been filtered out? eg depth limited
                const targetUmlClass = umlClasses.find((c) => c.id === enumId);
                if (targetUmlClass) {
                    // Draw aggregated link from contract to contract level Enum
                    dotString += `\n${enumId} -> ${sourceUmlClass.id} [arrowhead=diamond, weight=2]`;
                }
            });
        }
        if (!classOptions.hideStructs) {
            // for each struct in the class
            sourceUmlClass.structs.forEach((structId) => {
                // Has the struct been filtered out? eg depth limited
                const targetUmlClass = umlClasses.find((c) => c.id === structId);
                if (targetUmlClass) {
                    // Draw aggregated link from contract to contract level Struct
                    dotString += `\n${structId} -> ${sourceUmlClass.id} [arrowhead=diamond, weight=2]`;
                }
            });
        }
        // for each association in that class
        for (const association of Object.values(sourceUmlClass.associations)) {
            const targetUmlClass = (0, associations_1.findAssociatedClass)(association, sourceUmlClass, umlClasses);
            if (targetUmlClass) {
                dotString += addAssociationToDot(sourceUmlClass, targetUmlClass, association, classOptions);
            }
        }
    }
    return dotString;
}
exports.addAssociationsToDot = addAssociationsToDot;
function addAssociationToDot(sourceUmlClass, targetUmlClass, association, classOptions = {}) {
    // do not include library or interface associations if hidden
    // Or associations to Structs, Enums or Constants if they are hidden
    if ((classOptions.hideLibraries &&
        (sourceUmlClass.stereotype === umlClass_1.ClassStereotype.Library ||
            targetUmlClass.stereotype === umlClass_1.ClassStereotype.Library)) ||
        (classOptions.hideInterfaces &&
            (targetUmlClass.stereotype === umlClass_1.ClassStereotype.Interface ||
                sourceUmlClass.stereotype === umlClass_1.ClassStereotype.Interface)) ||
        (classOptions.hideAbstracts &&
            (targetUmlClass.stereotype === umlClass_1.ClassStereotype.Abstract ||
                sourceUmlClass.stereotype === umlClass_1.ClassStereotype.Abstract)) ||
        (classOptions.hideStructs &&
            targetUmlClass.stereotype === umlClass_1.ClassStereotype.Struct) ||
        (classOptions.hideEnums &&
            targetUmlClass.stereotype === umlClass_1.ClassStereotype.Enum) ||
        (classOptions.hideConstants &&
            targetUmlClass.stereotype === umlClass_1.ClassStereotype.Constant)) {
        return '';
    }
    let dotString = `\n${sourceUmlClass.id} -> ${targetUmlClass.id} [`;
    if (association.referenceType == umlClass_1.ReferenceType.Memory ||
        (association.realization &&
            targetUmlClass.stereotype === umlClass_1.ClassStereotype.Interface)) {
        dotString += 'style=dashed, ';
    }
    if (association.realization) {
        dotString += 'arrowhead=empty, arrowsize=3, ';
        if (!targetUmlClass.stereotype) {
            dotString += 'weight=4, ';
        }
        else {
            dotString += 'weight=3, ';
        }
    }
    return dotString + ']';
}
//# sourceMappingURL=converterClasses2Dot.js.map