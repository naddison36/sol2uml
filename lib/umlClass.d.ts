export declare enum Visibility {
    None = 0,
    Public = 1,
    External = 2,
    Internal = 3,
    Private = 4
}
export declare enum ClassStereotype {
    None = 0,
    Library = 1,
    Interface = 2,
    Abstract = 3,
    Contract = 4,
    Struct = 5,
    Enum = 6,
    Constant = 7,
    Import = 8
}
export declare enum OperatorStereotype {
    None = 0,
    Modifier = 1,
    Event = 2,
    Payable = 3,
    Fallback = 4,
    Abstract = 5
}
export declare enum AttributeType {
    Elementary = 0,
    UserDefined = 1,
    Function = 2,
    Array = 3,
    Mapping = 4
}
export interface Import {
    absolutePath: string;
    classNames: {
        className: string;
        alias?: string;
    }[];
}
export interface Attribute {
    visibility?: Visibility;
    name: string;
    type?: string;
    attributeType?: AttributeType;
    compiled?: boolean;
    sourceContract?: string;
}
export interface Parameter {
    name?: string;
    type: string;
}
export interface Operator extends Attribute {
    stereotype?: OperatorStereotype;
    parameters?: Parameter[];
    returnParameters?: Parameter[];
    stateMutability?: string;
    modifiers?: string[];
    hash?: string;
    inheritancePosition?: number;
    sourceContract?: string;
}
export declare enum ReferenceType {
    Memory = 0,
    Storage = 1
}
export interface Association {
    referenceType: ReferenceType;
    parentUmlClassName?: string;
    targetUmlClassName: string;
    realization?: boolean;
    functionsCalled?: string[];
}
export interface Constants {
    name: string;
    value: number;
    sourceContract?: string;
}
export interface ClassProperties {
    name: string;
    absolutePath: string;
    relativePath: string;
    parentId?: number;
    importedFileNames?: string[];
    stereotype?: ClassStereotype;
    enums?: number[];
    structs?: number[];
    attributes?: Attribute[];
    operators?: Operator[];
    associations?: {
        [name: string]: Association;
    };
    constants?: Constants[];
}
export declare class UmlClass implements ClassProperties {
    static idCounter: number;
    id: number;
    name: string;
    absolutePath: string;
    relativePath: string;
    parentId?: number;
    imports: Import[];
    stereotype?: ClassStereotype;
    constants: Constants[];
    attributes: Attribute[];
    operators: Operator[];
    enums: number[];
    structs: number[];
    associations: {
        [name: string]: Association;
    };
    memberAccessCalls: Set<string>;
    constructor(properties: ClassProperties);
    addAssociation(association: Association): void;
    /**
     * Gets the immediate parent contracts this class inherits from.
     * Does not include any grand parent associations. That has to be done recursively.
     */
    getParentContracts(): Association[];
}
