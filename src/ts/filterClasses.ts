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

export const filterHiddenClasses = (
    umlClasses: UmlClass[],
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
            u.stereotype === ClassStereotype.None ||
            u.stereotype === ClassStereotype.Contract
    )
}

export const classesConnectedToBaseContracts = (
    umlClasses: UmlClass[],
    baseContractNames: string[],
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

export const classesConnectedToBaseContract = (
    umlClasses: UmlClass[],
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

function loadWeightedDirectedGraph(umlClasses: UmlClass[]): WeightedDiGraph {
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
            console.log(
                `isTarget ${isTarget} Adding edge from ${sourceUmlClass.name} with id ${sourceUmlClass.id} to ${targetUmlClass.name} with id ${targetUmlClass.id} and type ${targetUmlClass.stereotype}`
            )
            weightedDirectedGraph.addEdge(
                new Edge(sourceUmlClass.id, targetUmlClass.id, 1)
            )
        }
    }

    return weightedDirectedGraph
}

export const topologicalSortClasses = (umlClasses: UmlClass[]): UmlClass[] => {
    const directedAcyclicGraph = loadDirectedAcyclicGraph(umlClasses)
    const topologicalSort = new TopologicalSort(directedAcyclicGraph)

    // Topological sort the class ids
    const sortedUmlClassIds = topologicalSort.order().reverse()
    const sortedUmlClasses = sortedUmlClassIds.map((umlClassId) =>
        // Lookup the UmlClass for each class id
        umlClasses.find((umlClass) => umlClass.id === umlClassId)
    )

    return sortedUmlClasses
}

const loadDirectedAcyclicGraph = (umlClasses: UmlClass[]): DiGraph => {
    const directedAcyclicGraph = new DiGraph(umlClasses.length) // the number vertices in the graph

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
