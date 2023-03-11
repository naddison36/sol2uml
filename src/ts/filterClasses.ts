import {
    DiGraph,
    Dijkstra,
    Edge,
    TopologicalSort,
    WeightedDiGraph,
} from 'js-graph-algorithms'
import { ClassStereotype, UmlClass } from './umlClass'
import { findAssociatedClass } from './associations'
import { ClassOptions } from './converterClass2Dot'

const debug = require('debug')('sol2uml')

/**
 * Filter out any UML Class types that are to be hidden.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param options sol2uml class options
 * @return umlClasses filtered list of UML classes of type `UMLClass`
 */
export const filterHiddenClasses = (
    umlClasses: readonly UmlClass[],
    options: ClassOptions
): UmlClass[] => {
    return umlClasses.filter(
        (u) =>
            (u.stereotype === ClassStereotype.Enum && !options.hideEnums) ||
            (u.stereotype === ClassStereotype.Struct && !options.hideStructs) ||
            (u.stereotype === ClassStereotype.Abstract &&
                !options.hideAbstracts) ||
            (u.stereotype === ClassStereotype.Interface &&
                !options.hideInterfaces) ||
            (u.stereotype === ClassStereotype.Constant &&
                !options.hideConstants) ||
            (u.stereotype === ClassStereotype.Library &&
                !options.hideLibraries) ||
            ((u.stereotype === ClassStereotype.None ||
                u.stereotype === ClassStereotype.Contract) &&
                !options.hideContracts)
    )
}

/**
 * Finds all the UML classes that have an association with a list of base contract names.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractNames array of base contract names
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
export const classesConnectedToBaseContracts = (
    umlClasses: readonly UmlClass[],
    baseContractNames: readonly string[],
    depth?: number
): UmlClass[] => {
    let filteredUmlClasses: { [contractName: string]: UmlClass } = {}

    const weightedDirectedGraph = loadWeightedDirectedGraph(umlClasses)

    for (const baseContractName of baseContractNames) {
        filteredUmlClasses = {
            ...filteredUmlClasses,
            ...classesConnectedToBaseContract(
                umlClasses,
                baseContractName,
                weightedDirectedGraph,
                depth
            ),
        }
    }

    return Object.values(filteredUmlClasses)
}

/**
 * Finds all the UML classes that have an association with a base contract name.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractName base contract name
 * @param weightedDirectedGraph graph of type WeightedDiGraph from the `js-graph-algorithms` package
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
export const classesConnectedToBaseContract = (
    umlClasses: readonly UmlClass[],
    baseContractName: string,
    weightedDirectedGraph: WeightedDiGraph,
    depth: number = 1000
): { [contractName: string]: UmlClass } => {
    // Find the base UML Class from the base contract name
    const baseUmlClass = umlClasses.find(({ name }) => {
        return name === baseContractName
    })

    if (!baseUmlClass) {
        throw Error(
            `Failed to find base contract with name "${baseContractName}"`
        )
    }

    const dfs = new Dijkstra(weightedDirectedGraph, baseUmlClass.id)

    // Get all the UML Classes that are connected to the base contract
    const filteredUmlClasses: { [contractName: string]: UmlClass } = {}
    for (const umlClass of umlClasses) {
        if (dfs.distanceTo(umlClass.id) <= depth) {
            filteredUmlClasses[umlClass.name] = umlClass
        }
    }

    return filteredUmlClasses
}

function loadWeightedDirectedGraph(
    umlClasses: readonly UmlClass[]
): WeightedDiGraph {
    const weightedDirectedGraph = new WeightedDiGraph(
        // the number vertices in the graph
        UmlClass.idCounter + 1
    )

    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = findAssociatedClass(
                association,
                sourceUmlClass,
                umlClasses
            )

            if (!targetUmlClass) {
                continue
            }
            const isTarget = umlClasses.find((u) => u.id === targetUmlClass.id)
            debug(
                `isTarget ${isTarget} Adding edge from ${sourceUmlClass.name} with id ${sourceUmlClass.id} to ${targetUmlClass.name} with id ${targetUmlClass.id} and type ${targetUmlClass.stereotype}`
            )
            weightedDirectedGraph.addEdge(
                new Edge(sourceUmlClass.id, targetUmlClass.id, 1)
            )
        }
    }

    return weightedDirectedGraph
}

export const topologicalSortClasses = (
    umlClasses: readonly UmlClass[]
): UmlClass[] => {
    const directedAcyclicGraph = loadDirectedAcyclicGraph(umlClasses)
    const topologicalSort = new TopologicalSort(directedAcyclicGraph)

    // Topological sort the class ids
    const sortedUmlClassIds = topologicalSort.order().reverse()
    const sortedUmlClasses = sortedUmlClassIds.map((umlClassId) =>
        // Lookup the UmlClass for each class id
        umlClasses.find((umlClass) => umlClass.id === umlClassId)
    )

    // Filter out any unfound classes. This happens when diff sources the second contract.
    return sortedUmlClasses.filter((umlClass) => umlClass !== undefined)
}

const loadDirectedAcyclicGraph = (umlClasses: readonly UmlClass[]): DiGraph => {
    const directedAcyclicGraph = new DiGraph(UmlClass.idCounter) // the number vertices in the graph

    for (const sourceUmlClass of umlClasses) {
        for (const association of Object.values(sourceUmlClass.associations)) {
            // Find the first UML Class that matches the target class name
            const targetUmlClass = findAssociatedClass(
                association,
                sourceUmlClass,
                umlClasses
            )

            if (!targetUmlClass) {
                continue
            }

            directedAcyclicGraph.addEdge(sourceUmlClass.id, targetUmlClass.id)
        }
    }

    return directedAcyclicGraph
}
