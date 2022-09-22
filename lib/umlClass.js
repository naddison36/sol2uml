"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UmlClass = exports.ReferenceType = exports.AttributeType = exports.OperatorStereotype = exports.ClassStereotype = exports.Visibility = void 0;
var Visibility;
(function (Visibility) {
    Visibility[Visibility["None"] = 0] = "None";
    Visibility[Visibility["Public"] = 1] = "Public";
    Visibility[Visibility["External"] = 2] = "External";
    Visibility[Visibility["Internal"] = 3] = "Internal";
    Visibility[Visibility["Private"] = 4] = "Private";
})(Visibility = exports.Visibility || (exports.Visibility = {}));
var ClassStereotype;
(function (ClassStereotype) {
    ClassStereotype[ClassStereotype["None"] = 0] = "None";
    ClassStereotype[ClassStereotype["Library"] = 1] = "Library";
    ClassStereotype[ClassStereotype["Interface"] = 2] = "Interface";
    ClassStereotype[ClassStereotype["Abstract"] = 3] = "Abstract";
    ClassStereotype[ClassStereotype["Contract"] = 4] = "Contract";
    ClassStereotype[ClassStereotype["Struct"] = 5] = "Struct";
    ClassStereotype[ClassStereotype["Enum"] = 6] = "Enum";
    ClassStereotype[ClassStereotype["Constant"] = 7] = "Constant";
    ClassStereotype[ClassStereotype["Import"] = 8] = "Import";
})(ClassStereotype = exports.ClassStereotype || (exports.ClassStereotype = {}));
var OperatorStereotype;
(function (OperatorStereotype) {
    OperatorStereotype[OperatorStereotype["None"] = 0] = "None";
    OperatorStereotype[OperatorStereotype["Modifier"] = 1] = "Modifier";
    OperatorStereotype[OperatorStereotype["Event"] = 2] = "Event";
    OperatorStereotype[OperatorStereotype["Payable"] = 3] = "Payable";
    OperatorStereotype[OperatorStereotype["Fallback"] = 4] = "Fallback";
    OperatorStereotype[OperatorStereotype["Abstract"] = 5] = "Abstract";
})(OperatorStereotype = exports.OperatorStereotype || (exports.OperatorStereotype = {}));
var AttributeType;
(function (AttributeType) {
    AttributeType[AttributeType["Elementary"] = 0] = "Elementary";
    AttributeType[AttributeType["UserDefined"] = 1] = "UserDefined";
    AttributeType[AttributeType["Function"] = 2] = "Function";
    AttributeType[AttributeType["Array"] = 3] = "Array";
    AttributeType[AttributeType["Mapping"] = 4] = "Mapping";
})(AttributeType = exports.AttributeType || (exports.AttributeType = {}));
var ReferenceType;
(function (ReferenceType) {
    ReferenceType[ReferenceType["Memory"] = 0] = "Memory";
    ReferenceType[ReferenceType["Storage"] = 1] = "Storage";
})(ReferenceType = exports.ReferenceType || (exports.ReferenceType = {}));
class UmlClass {
    constructor(properties) {
        this.constants = [];
        this.attributes = [];
        this.operators = [];
        this.enums = [];
        this.structs = [];
        this.associations = {};
        if (!properties || !properties.name) {
            throw TypeError(`Failed to instantiate UML Class with no name property`);
        }
        Object.assign(this, properties);
        // Generate a unique identifier for this UML Class
        this.id = UmlClass.idCounter++;
    }
    addAssociation(association) {
        if (!association || !association.targetUmlClassName) {
            throw TypeError(`Failed to add association. targetUmlClassName was missing`);
        }
        // Will not duplicate lines to the same class and stereotype
        // const targetUmlClass = `${association.targetUmlClassName}#${association.targetUmlClassStereotype}`
        const targetUmlClass = association.targetUmlClassName;
        // If association doesn't already exist
        if (!this.associations[targetUmlClass]) {
            this.associations[targetUmlClass] = association;
        }
        // associate already exists
        else {
            // If new attribute reference type is Storage
            if (association.referenceType === ReferenceType.Storage) {
                this.associations[targetUmlClass].referenceType =
                    ReferenceType.Storage;
            }
        }
    }
    /**
     * Gets the immediate parent contracts this class inherits from.
     * Does not include any grand parent associations. That has to be done recursively.
     */
    getParentContracts() {
        return Object.values(this.associations).filter((association) => association.realization &&
            association.targetUmlClassStereotype !==
                ClassStereotype.Interface);
    }
}
exports.UmlClass = UmlClass;
UmlClass.idCounter = 0;
//# sourceMappingURL=umlClass.js.map