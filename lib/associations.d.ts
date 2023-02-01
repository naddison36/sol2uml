import { Association, UmlClass } from './umlClass';
export declare const findAssociatedClass: (association: Association, sourceUmlClass: UmlClass, umlClasses: readonly UmlClass[], searchedAbsolutePaths?: string[]) => UmlClass | undefined;
