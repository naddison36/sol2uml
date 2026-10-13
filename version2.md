# Version 2.x Changes

## Changes to the command line interface

-   Class diagrams are now under a class subcommand. `sol2uml class`
-   New storage subcommand to draw the storage slots of a contract. `sol2uml storage`
-   New flatten subcommand that downloads the verified source code from Etherscan to a local Solidity file. `sol2uml flatten`

### Renamed command line options

-   `-d --depthLimit` to `-sf --subfolders`
-   `-a --hideAttributes` to `-hv --hideVariables`
-   `-p --hideOperations` to `-hf --hideFunctions`
-   `-e, --hideEnums` to `-he, --hideEnums`
-   `-s, --hideStructs` to `-hs, --hideStructs`
-   `-l, --hideLibraries` to `-hl, --hideLibraries`
-   `-t, --hideInterfaces` to `-hi, --hideInterfaces`
-   `-r, --hideInternals` to `-hp, --hidePrivates`

### New command line options

-   Added `-d --depth` to limit the depth of contracts connected to the base contracts.
-   Added `-ha --hideAbstracts` to hide all abstract contracts.
-   Added `-hn, --hideFilename` to hide the relative filename of a contract.

# Fixes

-   Improved linkages of classes when there are duplicate contract names, explicit imports and import aliases.
-   If a contract or library contains a struct, it is marked as an aggregate association. A separate dependency line is used to link a contract to a struct. This can be a storage (solid line) or memory (dashed line) dependency.
-   Structs in libraries are now linked to their dependent contract.
