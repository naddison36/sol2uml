# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

sol2uml is a CLI tool that generates UML class diagrams and storage layout diagrams from Solidity smart contracts. It works with both local Solidity files and verified contracts fetched from Etherscan-like blockchain explorers. It also supports flattening and diffing contracts.

## Common Commands

```bash
npm run clean          # Clean lib/ directory
npm run build          # Compile TypeScript (src/ts/ → lib/)
npm run permit         # make sol2uml executable globally with npm link
npm npm link           # Link the package globally for testing
npm test               # Run all Jest tests
npx jest --testPathPattern=fileParser   # Run a single test file
npm run lint           # ESLint on src/ts/
npm run prettier       # Format code with Prettier
npm run prettier:check # Check formatting without writing
npm publish            # Publish to npm
```

After building, the CLI is available at `lib/sol2uml.js`. Use `npm link` to test it globally as `sol2uml`.

## Code Style

- Prettier: single quotes, no semicolons, 4-space indentation
- ESLint: prefer-const, unused vars prefixed with `_`, no `@ts-ignore` without description
- TypeScript strict mode: noImplicitAny, noImplicitReturns, noUnusedLocals

## Architecture

The tool follows a pipeline architecture with four CLI commands: `class` (default), `storage`, `flatten`, `diff`.

### Pipeline Flow (class command)

```
Input (files/folders/address)
  → Parser (Solidity → AST via @solidity-parser/parser)
  → AST Converter (AST → UmlClass domain model)
  → Filters (graph-based filtering, squashing)
  → DOT Generator (UmlClass → Graphviz DOT)
  → Output Writer (DOT → SVG/PNG via viz.js)
```

### Key Source Files (src/ts/)

- **sol2uml.ts** — CLI entry point using commander
- **parserGeneral.ts** — Main parser dispatcher; routes to file or Etherscan parser
- **parserFiles.ts** — Recursively finds and parses local .sol files using klaw
- **parserEtherscan.ts** — `EtherscanParser` class fetching verified code from 20+ blockchain explorers
- **converterAST2Classes.ts** — Core AST-to-UmlClass transformation (largest file)
- **umlClass.ts** — Domain model: `UmlClass`, `Attribute`, `Operator`, `Association`, stereotypes, visibility enums
- **filterClasses.ts** — Graph-based filtering using js-graph-algorithms (topological sort, Dijkstra)
- **squashClasses.ts** — Collapses inheritance hierarchies
- **converterClasses2Dot.ts / converterClass2Dot.ts** — UmlClass array/single → Graphviz DOT format
- **converterClasses2Storage.ts / converterStorage2Dot.ts** — Storage slot layout visualization
- **writerFiles.ts** — Output dispatch: DOT → SVG (viz.js) → PNG (convert-svg-to-png)
- **diffContracts.ts** — Contract comparison logic using diff-match-patch
- **slotValues.ts** — Fetches on-chain storage values via ethers.js v5
- **index.ts** — Barrel exports for library usage

### Important Domain Types (umlClass.ts)

- `ClassStereotype`: Contract, Library, Interface, Abstract, Struct, Enum, Constant
- `OperatorStereotype`: Event, Modifier, Payable, Fallback, Abstract
- `ReferenceType`: Storage, Memory (determines association type)
- `Visibility`: Public, External, Internal, Private

### Tests

Tests are in `src/ts/__tests__/*.test.ts` using Jest with ts-jest. Test Solidity contracts are in `src/contracts/`. Some tests require `SCAN_API_KEY` and `NODE_URL` environment variables for Etherscan API and RPC access.

## Dependencies

- `@openzeppelin/contracts` — Do NOT update this dependency. It is only used as test input for generating diagrams, not as a runtime or build dependency.
- `commander` — Do NOT upgrade past v12. Commander v13+ rejects multi-character short flags (e.g. `-hv`, `-sf`, `-bc`) which sol2uml uses extensively (~28 options). Upgrading would require changing all short flags, breaking existing user scripts and documentation.

## Environment Variables

- `SCAN_API_KEY` — API key for Etherscan-like explorers
- `NODE_URL` — Ethereum RPC endpoint (for storage value retrieval)
- `DEBUG=sol2uml` — Enable debug logging
