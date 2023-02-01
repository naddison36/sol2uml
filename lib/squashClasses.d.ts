import { UmlClass } from './umlClass';
/**
 * Flattens the inheritance hierarchy for each base contract.
 * @param umlClasses array of UML classes of type `UMLClass`. The new squashed class is added to this array.
 * @param baseContractNames array of contract names to be rendered in squashed format.
 * @return squashUmlClasses array of UML classes of type `UMLClass` that are to be rendered
 */
export declare const squashUmlClasses: (umlClasses: UmlClass[], baseContractNames: readonly string[]) => UmlClass[];
