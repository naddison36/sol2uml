import { UmlClass } from './umlClass';
export interface ClassOptions {
    hideConstants?: boolean;
    hideContracts?: boolean;
    hideVariables?: boolean;
    hideFunctions?: boolean;
    hideModifiers?: boolean;
    hideEvents?: boolean;
    hideStructs?: boolean;
    hideEnums?: boolean;
    hideLibraries?: boolean;
    hideInterfaces?: boolean;
    hidePrivates?: boolean;
    hideAbstracts?: boolean;
    hideFilename?: boolean;
    hideSourceContract?: boolean;
    backColor?: string;
    shapeColor?: string;
    fillColor?: string;
    textColor?: string;
}
export declare const convertClass2Dot: (umlClass: UmlClass, options?: ClassOptions) => string;
