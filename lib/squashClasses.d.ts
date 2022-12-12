import { UmlClass } from './umlClass';
/**
 * Flattens the inheritance hierarchy for each base contract.
 * @param umlClasses array of UML classes of type `UMLClass`
 * @param baseContractNames array of contract names to be rendered in squashed format.
 * @return squashUmlClasses array of UML classes of type `UMLClass`
 */
export declare const squashUmlClasses: (umlClasses: UmlClass[], baseContractNames: string[]) => UmlClass[];
