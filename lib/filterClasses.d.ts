import { WeightedDiGraph } from 'js-graph-algorithms';
import { UmlClass } from './umlClass';
import { ClassOptions } from './converterClass2Dot';
/**
 * Filter out any UML Class types that are to be hidden.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param options sol2uml class options
 * @return umlClasses filtered list of UML classes of type `UMLClass`
 */
export declare const filterHiddenClasses: (umlClasses: readonly UmlClass[], options: ClassOptions) => UmlClass[];
/**
 * Finds all the UML classes that have an association with a list of base contract names.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractNames array of base contract names
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
export declare const classesConnectedToBaseContracts: (umlClasses: readonly UmlClass[], baseContractNames: readonly string[], depth?: number) => UmlClass[];
/**
 * Finds all the UML classes that have an association with a base contract name.
 * The associated classes can be contracts, abstract contracts, interfaces, libraries, enums, structs or constants.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractName base contract name
 * @param weightedDirectedGraph graph of type WeightedDiGraph from the `js-graph-algorithms` package
 * @param depth limit the number of associations from the base contract.
 * @return filteredUmlClasses list of UML classes of type `UMLClass`
 */
export declare const classesConnectedToBaseContract: (umlClasses: readonly UmlClass[], baseContractName: string, weightedDirectedGraph: WeightedDiGraph, depth?: number) => {
    [contractName: string]: UmlClass;
};
export declare const topologicalSortClasses: (umlClasses: readonly UmlClass[]) => UmlClass[];
