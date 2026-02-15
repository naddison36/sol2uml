"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAssociatedClass = void 0;
// Find the UML class linked to the association
const findAssociatedClass = (association, sourceUmlClass, umlClasses) => {
    // Phase 1: Iterative BFS through import chain, trying direct match at each level
    const { result, visitedSources } = _findViaImportChain(association, sourceUmlClass, umlClasses);
    if (result)
        return result;
    // Phase 2: Try inherited types for each source visited during import chain traversal
    const visitedClassIds = new Set();
    for (const source of visitedSources) {
        const inherited = _findInheritedType(association, source, umlClasses, visitedClassIds);
        if (inherited)
            return inherited;
    }
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
// Try to find a direct match for the association from the given source class
const _tryDirectMatch = (association, sourceUmlClass, umlClasses) => {
    return umlClasses.find((targetUmlClass) => {
        const targetParentClass = association.parentUmlClassName &&
            targetUmlClass.parentId !== undefined
            ? umlClasses[targetUmlClass.parentId]
            : undefined;
        return isAssociated(association, sourceUmlClass, targetUmlClass, targetParentClass);
    });
};
// Iterative BFS through import chain, trying direct match at each level.
// Returns the matched class (if found) and the list of source classes visited.
const _findViaImportChain = (association, sourceUmlClass, umlClasses) => {
    const searched = new Set();
    const visitedSources = [];
    const visitedPaths = new Set();
    const queue = [
        {
            source: sourceUmlClass,
            targetName: association.targetUmlClassName,
        },
    ];
    while (queue.length > 0) {
        const { source, targetName } = queue.shift();
        const key = `${source.absolutePath}::${targetName}`;
        if (searched.has(key))
            continue;
        searched.add(key);
        // Track unique visited sources for phase 2 inherited type lookup
        if (!visitedPaths.has(source.absolutePath)) {
            visitedPaths.add(source.absolutePath);
            visitedSources.push(source);
        }
        // Build association with potentially de-aliased target name
        const currentAssoc = {
            ...association,
            targetUmlClassName: targetName,
        };
        // Try direct match from this source
        const match = _tryDirectMatch(currentAssoc, source, umlClasses);
        if (match)
            return { result: match, visitedSources };
        // Get imports that could lead to the target
        const imports = source.imports.filter((i) => i.classNames.length === 0 ||
            i.classNames.some((cn) => (targetName === cn.className && !cn.alias) ||
                targetName === cn.alias));
        for (const importDetail of imports) {
            const importedClass = umlClasses.find((c) => c.absolutePath === importDetail.absolutePath);
            if (!importedClass)
                continue;
            // Queue with current target name to continue the chain
            const origKey = `${importedClass.absolutePath}::${targetName}`;
            if (!searched.has(origKey)) {
                queue.push({ source: importedClass, targetName });
            }
            // Queue with de-aliased names for aliased imports
            for (const cn of importDetail.classNames) {
                if (cn.alias && targetName === cn.alias) {
                    const deAliasedKey = `${importedClass.absolutePath}::${cn.className}`;
                    if (!searched.has(deAliasedKey)) {
                        queue.push({
                            source: importedClass,
                            targetName: cn.className,
                        });
                    }
                }
            }
        }
    }
    return { visitedSources };
};
// Walk the inheritance chain to find types (structs, enums) defined on parent contracts.
// Uses visitedClassIds to prevent re-processing in diamond inheritance hierarchies.
const _findInheritedType = (association, sourceUmlClass, umlClasses, visitedClassIds) => {
    if (visitedClassIds.has(sourceUmlClass.id))
        return undefined;
    visitedClassIds.add(sourceUmlClass.id);
    const parentAssociations = sourceUmlClass.getParentContracts();
    for (const parentAssociation of parentAssociations) {
        // Resolve the parent class using import chain only (no inherited types)
        // to avoid mutual recursion between findAssociatedClass and _findInheritedType
        const { result: parent } = _findViaImportChain(parentAssociation, sourceUmlClass, umlClasses);
        if (!parent)
            continue;
        // Check parent's structs for the target type
        for (const structId of parent.structs) {
            const structUmlClass = umlClasses.find((c) => c.id === structId);
            if (!structUmlClass)
                continue;
            if (structUmlClass.name === association.targetUmlClassName) {
                return structUmlClass;
            }
        }
        // Check parent's enums for the target type
        for (const enumId of parent.enums) {
            const enumUmlClass = umlClasses.find((c) => c.id === enumId);
            if (!enumUmlClass)
                continue;
            if (enumUmlClass.name === association.targetUmlClassName) {
                return enumUmlClass;
            }
        }
        // Recursively check parent's parents
        const targetClass = _findInheritedType(association, parent, umlClasses, visitedClassIds);
        if (targetClass)
            return targetClass;
    }
    return undefined;
};
//# sourceMappingURL=associations.js.map