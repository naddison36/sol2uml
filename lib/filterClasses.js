"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topologicalSortClasses = exports.classesConnectedToBaseContract = exports.classesConnectedToBaseContracts = exports.filterHiddenClasses = void 0;
const js_graph_algorithms_1 = require("js-graph-algorithms");
const umlClass_1 = require("./umlClass");
const associations_1 = require("./associations");
const debug = require('debug')('sol2uml');
/**
 * Filter out any UML Class types that are to be hidden.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param options sol2uml class options
 * @return umlClasses filtered list of UML classes of type `UMLClass`
 */
const filterHiddenClasses = (umlClasses, options) => {
    return umlClasses.filter((u) => (u.stereotype === umlClass_1.ClassStereotype.Enum && !options.hideEnums) ||
        (u.stereotype === umlClass_1.ClassStereotype.Struct && !options.hideStructs) ||
        (u.stereotype === umlClass_1.ClassStereotype.Abstract &&
            !options.hideAbstracts) ||
        (u.stereotype === umlClass_1.ClassStereotype.Interface &&
            !options.hideInterfaces) ||
        (u.stereotype === umlClass_1.ClassStereotype.Constant &&
            !options.hideConstants) ||
        (u.stereotype === umlClass_1.ClassStereotype.Library &&
            !options.hideLibraries) ||
        u.stereotype === umlClass_1.ClassStereotype.None ||
        u.stereotype === umlClass_1.ClassStereotype.Contract);
};
exports.filterHiddenClasses = filterHiddenClasses;
/**
 * Finds all the UML classes that have an association with a list of base contract names.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractNames array of base contract names
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
const classesConnectedToBaseContracts = (umlClasses, baseContractNames, depth) => {
    let filteredUmlClasses = {};
    const weightedDirectedGraph = loadWeightedDirectedGraph(umlClasses);
    for (const baseContractName of baseContractNames) {
        filteredUmlClasses = {
            ...filteredUmlClasses,
            ...(0, exports.classesConnectedToBaseContract)(umlClasses, baseContractName, weightedDirectedGraph, depth),
        };
    }
    return Object.values(filteredUmlClasses);
};
exports.classesConnectedToBaseContracts = classesConnectedToBaseContracts;
/**
 * Finds all the UML classes that have an association with a base contract name.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractName base contract name
 * @param weightedDirectedGraph graph of type WeightedDiGraph from the `js-graph-algorithms` package
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
const classesConnectedToBaseContract = (umlClasses, baseContractName, weightedDirectedGraph, depth = 1000) => {
    // Find the base UML Class from the base contract name
    const baseUmlClass = umlClasses.find(({ name }) => {
        return name === baseContractName;
    });
    if (!baseUmlClass) {
        throw Error(`Failed to find base contract with name "${baseContractName}"`);
    }
    const dfs = new js_graph_algorithms_1.Dijkstra(weightedDirectedGraph, baseUmlClass.id);
    // Get all the UML Classes that are connected to the base contract
    const filteredUmlClasses = {};
    for (const umlClass of umlClasses) {
        if (dfs.distanceTo(umlClass.id) <= depth) {
            filteredUmlClasses[umlClass.name] = umlClass;
        }
    }
    return filteredUmlClasses;
};
exports.classesConnectedToBaseContract = classesConnectedToBaseContract;
function loadWeightedDirectedGraph(umlClasses) {
    const weightedDirectedGraph = new js_graph_algorithms_1.WeightedDiGraph(
    // the number vertices in the graph
    umlClass_1.UmlClass.idCounter + 1);
    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = (0, associations_1.findAssociatedClass)(association, sourceUmlClass, umlClasses);
            if (!targetUmlClass) {
                continue;
            }
            const isTarget = umlClasses.find((u) => u.id === targetUmlClass.id);
            debug(`isTarget ${isTarget} Adding edge from ${sourceUmlClass.name} with id ${sourceUmlClass.id} to ${targetUmlClass.name} with id ${targetUmlClass.id} and type ${targetUmlClass.stereotype}`);
            weightedDirectedGraph.addEdge(new js_graph_algorithms_1.Edge(sourceUmlClass.id, targetUmlClass.id, 1));
        }
    }
    return weightedDirectedGraph;
}
const topologicalSortClasses = (umlClasses) => {
    const directedAcyclicGraph = loadDirectedAcyclicGraph(umlClasses);
    const topologicalSort = new js_graph_algorithms_1.TopologicalSort(directedAcyclicGraph);
    // Topological sort the class ids
    const sortedUmlClassIds = topologicalSort.order().reverse();
    const sortedUmlClasses = sortedUmlClassIds.map((umlClassId) => 
    // Lookup the UmlClass for each class id
    umlClasses.find((umlClass) => umlClass.id === umlClassId));
    // Filter out any unfound classes. This happens when diff sources the second contract.
    return sortedUmlClasses.filter((umlClass) => umlClass !== undefined);
};
exports.topologicalSortClasses = topologicalSortClasses;
const loadDirectedAcyclicGraph = (umlClasses) => {
    const directedAcyclicGraph = new js_graph_algorithms_1.DiGraph(umlClass_1.UmlClass.idCounter); // the number vertices in the graph
    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = (0, associations_1.findAssociatedClass)(association, sourceUmlClass, umlClasses);
            if (!targetUmlClass) {
                continue;
            }
            directedAcyclicGraph.addEdge(sourceUmlClass.id, targetUmlClass.id);
        }
    }
    return directedAcyclicGraph;
};
//# sourceMappingURL=filterClasses.js.map