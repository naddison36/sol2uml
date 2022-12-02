import { ClassStereotype, Operator, UmlClass } from './umlClass'
import * as crypto from 'crypto'

const debug = require('debug')('sol2uml')

export const squashUmlClasses = (
    umlClasses: UmlClass[],
    squashContractNames: string[]
): UmlClass[] => {
    let removedClassIds: number[] = []
    for (const squashContractName of squashContractNames) {
        // Find the base UML Class to squash
        let baseIndex = umlClasses.findIndex(({ name }) => {
            return name === squashContractName
        })
        if (!baseIndex) {
            throw Error(
                `Failed to find contract with name "${squashContractName}" to squash`
            )
        }
        const baseClass = umlClasses[baseIndex]

        let squashedClass = new UmlClass({
            name: baseClass.name,
            absolutePath: baseClass.absolutePath,
            relativePath: baseClass.relativePath,
        })
        squashedClass.id = baseClass.id
        const result = recursiveSquash(
            squashedClass,
            [],
            baseClass,
            umlClasses,
            1
        )
        removedClassIds = removedClassIds.concat(result.removedClassIds)

        // Remove overridden functions from squashed class
        squashedClass.operators = reduceOperators(squashedClass.operators)

        umlClasses[baseIndex] = squashedClass
    }
    // remove any squashed classes
    return umlClasses.filter((u) => !removedClassIds.includes(u.id))
}

const recursiveSquash = (
    squashedClass: UmlClass,
    inheritedContractNames: string[],
    baseClass: UmlClass,
    umlClasses: UmlClass[],
    startPosition: number
): { currentPosition: number; removedClassIds: number[] } => {
    let currentPosition = startPosition
    const removedClassIds: number[] = []

    // For each association from the baseClass
    for (const [targetClassName, association] of Object.entries(
        baseClass.associations
    )) {
        // if inheritance and (Abstract or Contract)
        // Libraries and Interfaces will be copied
        if (association.realization) {
            // Find the target UML Class
            const inheritedContract = umlClasses.find(({ name }) => {
                return name === targetClassName
            })
            if (!inheritedContract) {
                debug(
                    `Warning: failed to find inherited contract with name ${targetClassName}`
                )
                continue
            }

            // Is the associated class a contract or abstract contract?
            if (inheritedContract?.stereotype === ClassStereotype.Library) {
                squashedClass.addAssociation(association)
            } else {
                // has the contract already been added to the inheritance tree?
                const alreadyInherited = inheritedContractNames.includes(
                    inheritedContract.name
                )
                // Do not add inherited contract if it has already been added to the inheritance tree
                if (!alreadyInherited) {
                    inheritedContractNames.push(inheritedContract.name)
                    const squashResult = recursiveSquash(
                        squashedClass,
                        inheritedContractNames,
                        inheritedContract,
                        umlClasses,
                        currentPosition++
                    )
                    // Add to list of removed class ids
                    removedClassIds.push(
                        ...squashResult.removedClassIds,
                        inheritedContract.id
                    )
                }
            }
        } else {
            // Copy association but will not duplicate it
            squashedClass.addAssociation(association)
        }
    }

    // Copy class properties from the baseClass to the squashedClass
    baseClass.constants.forEach((c) =>
        squashedClass.constants.push({ ...c, sourceContract: baseClass.name })
    )
    baseClass.attributes.forEach((a) =>
        squashedClass.attributes.push({ ...a, sourceContract: baseClass.name })
    )
    baseClass.enums.forEach((e) => squashedClass.enums.push(e))
    baseClass.structs.forEach((s) => squashedClass.structs.push(s))

    baseClass.imports.forEach((i) => squashedClass.imports.push(i))

    // copy the functions
    baseClass.operators.forEach((f) =>
        squashedClass.operators.push({
            ...f,
            hash: hash(f),
            inheritancePosition: currentPosition,
            sourceContract: baseClass.name,
        })
    )

    return {
        currentPosition,
        removedClassIds,
    }
}

const hash = (operator: Operator): string => {
    const hash = crypto.createHash('sha256')

    let data = operator.name
    operator.parameters?.forEach((p) => {
        data += ',' + p.type
    })
    operator.returnParameters?.forEach((p) => {
        data += ',' + p.type
    })

    return hash.update(data).digest('hex')
}

const reduceOperators = (operators: Operator[]): Operator[] => {
    const hashes = new Set(operators.map((o) => o.hash))

    const operatorsWithNoHash = operators.filter((o) => !o.hash)

    const newOperators: Operator[] = []
    for (const hash of hashes) {
        const operator = operators
            .filter((o) => o.hash === hash)
            // sort operators by inheritance position. smaller to highest
            .sort((o) => o.inheritancePosition)
            // get last operator in the array
            .slice(-1)[0]
        newOperators.push(operator)
    }
    newOperators.push(...operatorsWithNoHash)

    return newOperators
}
