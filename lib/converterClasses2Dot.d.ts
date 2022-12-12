import { ClassOptions } from './converterClass2Dot';
import { UmlClass } from './umlClass';
/**
 * Converts UML classes to Graphviz's DOT format.
 * The DOT grammar defines Graphviz nodes, edges, graphs, subgraphs, and clusters http://www.graphviz.org/doc/info/lang.html
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param clusterFolders flag if UML classes are to be clustered into folders their source code was in
 * @param classOptions command line options for the `class` command
 * @return dotString Graphviz's DOT format for defining nodes, edges and clusters.
 */
export declare function convertUmlClasses2Dot(umlClasses: UmlClass[], clusterFolders?: boolean, classOptions?: ClassOptions): string;
export declare function addAssociationsToDot(umlClasses: UmlClass[], classOptions?: ClassOptions): string;
