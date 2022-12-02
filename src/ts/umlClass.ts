export enum Visibility {
    None,
    Public,
    External,
    Internal,
    Private,
}

export enum ClassStereotype {
    None,
    Library,
    Interface,
    Abstract,
    Contract,
    Struct,
    Enum,
    Constant,
    Import,
}

export enum OperatorStereotype {
    None,
    Modifier,
    Event,
    Payable,
    Fallback,
    Abstract,
}

export enum AttributeType {
    Elementary,
    UserDefined,
    Function,
    Array,
    Mapping,
}

export interface Import {
    absolutePath: string
    classNames: {
        className: string
        alias?: string
    }[]
}

export interface Attribute {
    visibility?: Visibility
    name: string
    // Enums do not have types
    type?: string
    attributeType?: AttributeType
    compiled?: boolean // true for constants and immutables
    // Used for squashed classes
    sourceContract?: string
}

export interface Parameter {
    // name is not required in return parameters or operator parameters
    name?: string
    type: string
}

export interface Operator extends Attribute {
    stereotype?: OperatorStereotype
    parameters?: Parameter[]
    returnParameters?: Parameter[]
    isPayable?: boolean
    modifiers?: string[]
    // Used by squashed classes
    hash?: string
    inheritancePosition?: number
    sourceContract?: string
}

export enum ReferenceType {
    Memory,
    Storage,
}

export interface Association {
    referenceType: ReferenceType
    targetUmlClassName: string
    realization?: boolean
}

export interface Constants {
    name: string
    value: number
    // Used for squashed classes
    sourceContract?: string
}

export interface ClassProperties {
    name: string
    absolutePath: string
    relativePath: string
    importedFileNames?: string[]
    stereotype?: ClassStereotype
    enums?: number[]
    structs?: number[]
    attributes?: Attribute[]
    operators?: Operator[]
    associations?: { [name: string]: Association }
    constants?: Constants[]
}

export class UmlClass implements ClassProperties {
    static idCounter = 0

    id: number
    name: string
    absolutePath: string
    relativePath: string
    imports: Import[] = []
    stereotype?: ClassStereotype

    constants: Constants[] = []
    attributes: Attribute[] = []
    operators: Operator[] = []

    enums: number[] = []
    structs: number[] = []
    associations: { [name: string]: Association } = {}

    constructor(properties: ClassProperties) {
        if (!properties || !properties.name) {
            throw TypeError(
                `Failed to instantiate UML Class with no name property`
            )
        }

        Object.assign(this, properties)

        // Generate a unique identifier for this UML Class
        this.id = UmlClass.idCounter++
    }

    addAssociation(association: Association) {
        if (!association || !association.targetUmlClassName) {
            throw TypeError(
                `Failed to add association. targetUmlClassName was missing`
            )
        }

        // Will not duplicate lines to the same class and stereotype
        // const targetUmlClass = `${association.targetUmlClassName}#${association.targetUmlClassStereotype}`
        const targetUmlClass = association.targetUmlClassName

        // If association doesn't already exist
        if (!this.associations[targetUmlClass]) {
            this.associations[targetUmlClass] = association
        }
        // associate already exists
        else {
            // If new attribute reference type is Storage
            if (association.referenceType === ReferenceType.Storage) {
                this.associations[targetUmlClass].referenceType =
                    ReferenceType.Storage
            }
        }
    }

    /**
     * Gets the immediate parent contracts this class inherits from.
     * Does not include any grand parent associations. That has to be done recursively.
     */
    getParentContracts(): Association[] {
        return Object.values(this.associations).filter(
            (association) => association.realization
        )
    }
}
