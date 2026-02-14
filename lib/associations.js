"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAssociatedClass = void 0;
// Find the UML class linked to the association
const findAssociatedClass = (association, sourceUmlClass, umlClasses, _searchedAbsolutePaths = []) => {
    const umlClass = umlClasses.find((targetUmlClass) => {
        const targetParentClass = association.parentUmlClassName &&
            targetUmlClass.parentId !== undefined
            ? umlClasses[targetUmlClass.parentId]
            : undefined;
        return isAssociated(association, sourceUmlClass, targetUmlClass, targetParentClass);
    });
    // If a link was found
    if (umlClass)
        return umlClass;
    // // Could not find association so now need to recursively look at imports of imports
    // // add to already recursively processed files to avoid getting stuck in circular imports
    // searchedAbsolutePaths.push(sourceUmlClass.absolutePath)
    // const importedType = findChainedImport(
    //     association,
    //     sourceUmlClass,
    //     umlClasses,
    //     searchedAbsolutePaths,
    // )
    // if (importedType) return importedType
    // // Still could not find association so now need to recursively look for inherited types
    // const inheritedType = findInheritedType(
    //     association,
    //     sourceUmlClass,
    //     umlClasses,
    // )
    // if (inheritedType) return inheritedType
    return undefined;
};
exports.findAssociatedClass = findAssociatedClass;
// Tests if source class can be linked to the target class via an association
const isAssociated = (association, sourceUmlClass, targetUmlClass, targetParentUmlClass) => {
    if (association.parentUmlClassName) {
        return (
        // class is in the same source file
        (association.targetUmlClassName === targetUmlClass.name &&
            association.parentUmlClassName === targetParentUmlClass?.name &&
            sourceUmlClass.absolutePath === targetUmlClass.absolutePath) ||
            // imported classes with no explicit import names
            (association.targetUmlClassName === targetUmlClass.name &&
                association.parentUmlClassName === targetParentUmlClass?.name &&
                sourceUmlClass.imports.some((i) => i.absolutePath === targetUmlClass.absolutePath &&
                    i.classNames.length === 0)) ||
            // imported classes with explicit import names or import aliases
            sourceUmlClass.imports.some((importLink) => importLink.absolutePath === targetUmlClass.absolutePath &&
                importLink.classNames.some((importedClass) => 
                // If a parent contract with no import alias
                (association.targetUmlClassName ===
                    targetUmlClass.name &&
                    association.parentUmlClassName ===
                        importedClass.className &&
                    importedClass.alias == undefined) ||
                    // If a parent contract with import alias
                    (association.targetUmlClassName ===
                        targetUmlClass.name &&
                        association.parentUmlClassName ===
                            importedClass.alias))));
    }
    // No parent class in the association
    return (
    // class is in the same source file
    (association.targetUmlClassName === targetUmlClass.name &&
        sourceUmlClass.absolutePath === targetUmlClass.absolutePath) ||
        // imported classes with no explicit import names
        (association.targetUmlClassName === targetUmlClass.name &&
            sourceUmlClass.imports.some((i) => i.absolutePath === targetUmlClass.absolutePath &&
                i.classNames.length === 0)) ||
        // imported classes with explicit import names or import aliases
        sourceUmlClass.imports.some((importLink) => importLink.absolutePath === targetUmlClass.absolutePath &&
            importLink.classNames.some((importedClass) => 
            // no import alias
            (association.targetUmlClassName ===
                importedClass.className &&
                importedClass.className === targetUmlClass.name &&
                importedClass.alias == undefined) ||
                // import alias
                (association.targetUmlClassName ===
                    importedClass.alias &&
                    importedClass.className === targetUmlClass.name))));
};
const _findInheritedType = (association, sourceUmlClass, umlClasses) => {
    // Get all realized associations.
    const parentAssociations = sourceUmlClass.getParentContracts();
    // For each parent association
    for (const parentAssociation of parentAssociations) {
        const parent = (0, exports.findAssociatedClass)(parentAssociation, sourceUmlClass, umlClasses);
        if (!parent)
            continue;
        // For each struct on the parent
        for (const structId of parent.structs) {
            const structUmlClass = umlClasses.find((c) => c.id === structId);
            if (!structUmlClass)
                continue;
            if (structUmlClass.name === association.targetUmlClassName) {
                return structUmlClass;
            }
        }
        // For each enum on the parent
        for (const enumId of parent.enums) {
            const enumUmlClass = umlClasses.find((c) => c.id === enumId);
            if (!enumUmlClass)
                continue;
            if (enumUmlClass.name === association.targetUmlClassName) {
                return enumUmlClass;
            }
        }
        // Recursively look for inherited types
        const targetClass = _findInheritedType(association, parent, umlClasses);
        if (targetClass)
            return targetClass;
    }
    return undefined;
};
// const findChainedImport = (
//     association: Association,
//     sourceUmlClass: UmlClass,
//     umlClasses: readonly UmlClass[],
//     searchedRelativePaths: string[],
// ): UmlClass | undefined => {
//     // Get all valid imports. That is, imports that do not explicitly import contracts or interfaces
//     // or explicitly import the source class
//     const imports = sourceUmlClass.imports.filter(
//         (i) =>
//             i.classNames.length === 0 ||
//             i.classNames.some(
//                 (cn) =>
//                     (association.targetUmlClassName === cn.className &&
//                         !cn.alias) ||
//                     association.targetUmlClassName === cn.alias,
//             ),
//     )
//     // For each import
//     for (const importDetail of imports) {
//         // Find a class with the same absolute path as the import so we can get the new imports
//         const newSourceUmlClass = umlClasses.find(
//             (c) => c.absolutePath === importDetail.absolutePath,
//         )
//         if (!newSourceUmlClass) {
//             // Could not find a class in the import file so just move onto the next loop
//             continue
//         }
//         // Avoid circular imports
//         if (searchedRelativePaths.includes(newSourceUmlClass.absolutePath)) {
//             // Have already recursively looked for imports of imports in this file
//             continue
//         }
//
//         // find class linked to the association without aliased imports
//         const umlClass = findAssociatedClass(
//             association,
//             newSourceUmlClass,
//             umlClasses,
//             searchedRelativePaths,
//         )
//         if (umlClass) return umlClass
//
//         // find all aliased imports
//         const aliasedImports = importDetail.classNames.filter((cn) => cn.alias)
//         // For each aliased import
//         for (const aliasedImport of aliasedImports) {
//             const umlClass = findAssociatedClass(
//                 { ...association, targetUmlClassName: aliasedImport.className },
//                 newSourceUmlClass,
//                 umlClasses,
//                 searchedRelativePaths,
//             )
//             if (umlClass) return umlClass
//         }
//     }
//     return undefined
// }
//# sourceMappingURL=associations.js.map