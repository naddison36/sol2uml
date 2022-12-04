import { WeightedDiGraph } from 'js-graph-algorithms';
import { UmlClass } from './umlClass';
import { ClassOptions } from './converterClass2Dot';
export declare const filterHiddenClasses: (umlClasses: UmlClass[], options: ClassOptions) => UmlClass[];
export declare const classesConnectedToBaseContracts: (umlClasses: UmlClass[], baseContractNames: string[], depth?: number) => UmlClass[];
export declare const classesConnectedToBaseContract: (umlClasses: UmlClass[], baseContractName: string, weightedDirectedGraph: WeightedDiGraph, depth?: number) => {
    [contractName: string]: UmlClass;
};
export declare const topologicalSortClasses: (umlClasses: UmlClass[]) => UmlClass[];
