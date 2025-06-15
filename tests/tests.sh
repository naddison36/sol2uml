
export ARCHIVE_NODE_URL=https://

## Class

sol2uml class ../src/contracts/inheritance
sol2uml class --ignoreFilesOrFolders parent ../src/contracts/inheritance
sol2uml class --ignoreFilesOrFolders parent,ImportFromImport.sol ../src/contracts/inheritance
sol2uml class --ignoreFilesOrFolders parent, ../src/contracts/inheritance


# Flatten

### Aave V3 Pool Ethereum
sol2uml flatten 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2

# Diff

## Origin contracts
### OETH VaultCore
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c -v
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c --summary
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c --aFile contracts/governance/Governable.sol
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c --aFile contracts/vault/VaultCore.sol
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c --aFile contracts/vault/OETHVaultCore.sol --bFile contracts/vault/VaultCore.sol -v
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c --aFile contracts/vault/VaultStorage.sol
sol2uml diff 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c .,node_modules
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xe1b612b654891e0b311069b2aa0ac0e2a48be4a2 --bNetwork base -v
sol2uml diff 0x1091588Cc431275F99DC5Df311fd8E1Ab81c89F3 0xe1b612b654891e0b311069b2aa0ac0e2a48be4a2 --aFile contracts/vault/OETHVaultCore.sol --bNetwork base -v

### OETH VaultAdmin
sol2uml diff 0x31a91336414d3B955E494E7d485a6B06b55FC8fB .,node_modules

## Old Vault contract with a single, flattened file
sol2uml flatten 0x6bd6CC9605Ae43B424cB06363255b061A84DfFD3
sol2uml diff 0x6bd6CC9605Ae43B424cB06363255b061A84DfFD3 Vault
sol2uml diff 0x6bd6CC9605Ae43B424cB06363255b061A84DfFD3 Vault.sol

### OETH Frax Strategy
### Has added and changed contracts
sol2uml diff 0x167747bf5b3b6bf2f7f7c4cce32c463e9598d425 0x5061cde874f75d119de3b07e191644097343ab9e -v
sol2uml diff 0x167747bf5b3b6bf2f7f7c4cce32c463e9598d425 0x5061cde874f75d119de3b07e191644097343ab9e --summary
sol2uml diff 0x167747bf5b3b6bf2f7f7c4cce32c463e9598d425 0x5061cde874f75d119de3b07e191644097343ab9e --aFile Generalized4626Strategy

# Compare new implementation to local files
sol2uml diff 0x57d49c28cf9a0f65b1279a97ed01c3e49a5a173f .,node_modules

### OUSD Token
## Old contract was flattened, new contract has multiple files
sol2uml diff 0xB248c975DaeAc47c4960EcBD10a79E486eBD1cA8 0x33db8d52d65F75E4cdDA1b02463760c9561A2aa1 -v
sol2uml diff 0xB248c975DaeAc47c4960EcBD10a79E486eBD1cA8 0x33db8d52d65F75E4cdDA1b02463760c9561A2aa1 --flatten -v

### OUSD VaultCore upgrade
sol2uml diff 0x48Cf14DeA2f5dD31c57218877195913412D3278A 0x997c35A0bf8E21404aE4379841E0603C957138c3 -v
sol2uml diff 0x48Cf14DeA2f5dD31c57218877195913412D3278A 0x997c35A0bf8E21404aE4379841E0603C957138c3 --flatten
sol2uml diff 0x997c35A0bf8E21404aE4379841E0603C957138c3 .,node_modules

### OUSD Harvestor upgrade
### Proxy
sol2uml diff 0x21Fb5812D70B3396880D30e90D9e5C1202266c89 .,node_modules
sol2uml diff 0x21Fb5812D70B3396880D30e90D9e5C1202266c89 .,node_modules --aFile contracts/governance/Governable.sol
### Implementation
sol2uml diff 0x5e72eb0ab74b5b4d2766a7956d210746ceab96e1 .,node_modules

### Harvesters
sol2uml diff 0x5E72EB0ab74B5B4d2766a7956D210746Ceab96E1 0x1d6e0d7a1244276acf22a4e1dfc3c58186b1f624 -v

## Curve
### Vyper contracts - stETH and frxETH Metapool
sol2uml diff 0xdc24316b9ae028f1497c275eb9192a3ea0f67022 0xa1f8a6807c402e4a15ef4eba36528a3fed24e577 -v
### Vyper contracts - frxETH and OETH Metapool
sol2uml diff 0xa1f8a6807c402e4a15ef4eba36528a3fed24e577 0x94b17476a93b3262d87b9a326965d1e91f9c13e7
### Vyper contracts - rETH and OETH Metapool
sol2uml diff 0x0f3159811670c117c372428d4e69ac32325e4d0f 0x94b17476a93b3262d87b9a326965d1e91f9c13e7
### Vyper contracts Metapools deployed from Curve Facgtory 0xb9fc157394af804a3578134a6585c0dc9cc990d4
sol2uml diff 0xd0a5ca7b57780240db17bb89773fda8f0efce274 0x94b17476a93b3262d87b9a326965d1e91f9c13e7
sol2uml diff 0xd0a5ca7b57780240db17bb89773fda8f0efce274 0x4029f7dcbdf6059ed80da6856526e7510d64fa21
sol2uml diff 0x4029f7dcbdf6059ed80da6856526e7510d64fa21 0xd4cedef74fb8885b8e1de21fba5a2e2f33f21f58
sol2uml diff 0xAb3435bd2959fD713F7e50389Ff374Bfee2E3B4b 0x9a64dec8da8ce892ff711d715d9a8fc82e966a44

sol2uml diff 0x0c58c509305a8a7fe9a6a60ceaac6185b96ecbb7 0xd82c2eb10f4895cabed6eda6eeee234bd1a9838b
# 22 to 32 days ago
sol2uml diff 0x9d1784097ffeadae206faf65188561abaa9093a8 0x16f780aed4e5caa1b0c9a3ae6f67460d4d0cfeb5
# 16 to 32 days ago
sol2uml diff 0x901ac4816b427cea4a26099ead7051c8e54dace9 0x16f780aed4e5caa1b0c9a3ae6f67460d4d0cfeb5
### FRAX/USDC (crvFRAX) Ethereum v Arbitrum
sol2uml diff 0xdcef968d416a41cdac0ed8702fac8128a64241a2 0xc9b8a3fdecb9d5b218d02555a8baf332e5b740d5 --bNetwork arbitrum
sol2uml diff 0xdcef968d416a41cdac0ed8702fac8128a64241a2 0xc9b8a3fdecb9d5b218d02555a8baf332e5b740d5 -bn arbitrum

## Aave
### Aave V3 Pool Ethereum v Optimism
sol2uml diff 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 0x794a61358d6845594f94dc1db02a252b5b4814ad --bNetwork optimism
### Aave V3 Pool Ethereum v Optimism flattened
sol2uml diff 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 0x794a61358d6845594f94dc1db02a252b5b4814ad -bn optimism --flatten
### Aave V3 Pool Polygon v optimism
### all files are the same
sol2uml diff 0x794a61358D6845594F94dc1DB02A252b5b4814aD 0x794a61358d6845594f94dc1db02a252b5b4814ad -n polygon -bn optimism

## USDC
## flattened source files with different contract names
sol2uml diff 0xb7277a6e95992041568d9391d09d0122023778a2 0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf
# Compare DAI to USDC
sol2uml diff 0x6b175474e89094c44da98b954eedeac495271d0f 0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf

## Balancer
## Compare Balancer Vault on Ethereum and Arbitrum
sol2uml diff 0xBA12222222228d8Ba445958a75a0704d566BF2C8 0xBA12222222228d8Ba445958a75a0704d566BF2C8 --bNetwork arbitrum
## Compare Balancer Vault on Ethereum and optimism
sol2uml diff 0xBA12222222228d8Ba445958a75a0704d566BF2C8 0xBA12222222228d8Ba445958a75a0704d566BF2C8 --bNetwork optimism

# Uniswap
## Compare Uniswap SwapRouter02 between Ethereum and Celo
sol2uml diff 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45 0x5615CDAb10dc425a742d643d949a7F474C01abc4 --bNetwork celo
## Compare Uniswap SwapRouter02 between Ethereum and BNB
sol2uml diff 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45 0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2 --bNetwork bsc

# Storage

## TestStorage
sol2uml storage ../src/contracts -c TestStorage -v -o ../examples/storage

sol2uml storage ../src/contracts -c Associations -v

## FRAXStablecoin where Contract is followed by a boolean.
sol2uml storage -d 0x853d955aCEf822Db058eb8505911ED77F175b99e

## Origin Governance with data
sol2uml storage -d 0x3cdD07c16614059e66344a7b579DAB4f9516C0b6

## Origin OUSD Vault old VaultCore impl
sol2uml storage -d -s 0xe75d77b1865ae93c7eaa3040b038d7aa7bc02f70 0x997c35A0bf8E21404aE4379841E0603C957138c3 -hx ______gap
## VaultCore
sol2uml storage 0x997c35A0bf8E21404aE4379841E0603C957138c3 -hx ______gap -o VaultCoreOld.svg
sol2uml storage . -c VaultCore -hx ______gap -o VaultCoreNew.svg
## VaultAdmin
sol2uml storage 0x1ef0553feb80e6f133cae3092e38f0b23da6452b -hx ______gap -o VaultAdminOld.svg
sol2uml storage . -c VaultAdmin -hx ______gap -o VaultAdminNew.svg

## Origin OETH Vault Proxy
sol2uml storage 0x39254033945AA2E4809Cc2977E7087BEE48bd7Ab

## Origin OETH VaultCore
sol2uml storage 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c
sol2uml storage 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c -hx ______gap,_deprecated_swapTokens
sol2uml storage 0xEA24e9Bac006DE9635Ac7fA4D767fFb64FB5645c -hx ______gap,_deprecated_swapTokens,swapConfig

## OUSD Harvestor
sol2uml storage 0x5E72EB0ab74B5B4d2766a7956D210746Ceab96E1 -o HarvesterOld.svg
sol2uml storage . -c Harvester -o HarvesterNew.svg

## Maker DSR Strategy
## Implementation with all variables expanded
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F
## Implementation with no expended _reserved fixed array
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F --hideExpand _reserved
## Implementation with no expended _reserved, ______gap or __gap fixed arrays
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F --hideExpand _reserved,______gap,__gap
## Implementation with no expended _reserved, ______gap or __gap fixed arrays or dynamic array assetsMapped
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F --hideExpand _reserved,______gap,__gap,assetsMapped
## Proxy with data, no expended _reserved, ______gap or __gap variables
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F \
  -hx _reserved,______gap,__gap \
  --data --storage 0x6b69B755C629590eD59618A2712d8a2957CA98FC
## Proxy with data and expand all dynamic variables
sol2uml storage 0x8a3b6D3739461137d20825c36ED6016803d3104F \
  --data --storage 0x6b69B755C629590eD59618A2712d8a2957CA98FC

## Example from issue https://github.com/naddison36/sol2uml/issues/161
sol2uml storage 0xa90dAF1975BA13c26F63976e0Fd73A21F966EE0D --hideExpand __gap --network polygon -v

## Origin OETH Dripper with slotNames and types
sol2uml storage 0x2fdfbb2b905484f1445e23a97c97f65fe0e43dec \
  --slotNames OUSD.governor,OUSD.pending.governor,OUSD.reentry.status,0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \
  --slotTypes address,address,bool,address
sol2uml storage 0x2fdfbb2b905484f1445e23a97c97f65fe0e43dec -d -s 0xc0f42f73b8f01849a2dd99753524d4ba14317eb3 \
  --slotNames OUSD.governor,OUSD.pending.governor,OUSD.reentry.status,0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \
  --slotTypes address,address,bool,address
sol2uml storage 0x2fdfbb2b905484f1445e23a97c97f65fe0e43dec -d -s 0xc0f42f73b8f01849a2dd99753524d4ba14317eb3 \
  --slotNames OUSD.governor,OUSD.pending.governor,OUSD.reentry.status,0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc

## From issue https://github.com/naddison36/sol2uml/issues/175
sol2uml storage 0x8115366Ca7Cf280a760f0bC0F6Db3026e2437115 -v --data --storage 0xC13e21B648A5Ee794902342038FF3aDAB66BE987
sol2uml storage 0x8115366Ca7Cf280a760f0bC0F6Db3026e2437115 -v --data --storage 0xC13e21B648A5Ee794902342038FF3aDAB66BE987 --hideExpand ______gap --hideValues

# Test import of imports including aliased imports
sol2uml storage -v -c Concrete ../src/contracts/chainedImports

# Storage of a proxied multisig Safe on ApeChain
sol2uml storage --network 33139 0xfb1bffC9d739B8D520DaF37dF666da4C687191EA -d -s 0xcf8DEBAFA34E0Ab7d1F3452FF3024454F8Fea32b -v

# Class

export SCAN_API_KEY=your_api_key_here

## Maker DSR Strategy Implementation
sol2uml 0x8a3b6D3739461137d20825c36ED6016803d3104F -v
## Contract on Polygon
sol2uml 0xa90dAF1975BA13c26F63976e0Fd73A21F966EE0D --network polygon -v

## Local contracts
sol2uml ../src/contracts -b TestStorage -v

## Base chain
sol2uml 0xCF205808Ed36593aa40a44F10c7f7C2F67d4A4d4 -v --network base
## USDC on Base
sol2uml 0x1833C6171E0A3389B156eAedB301CFfbf328B463 -v --network base

# All OpenZeppelin contracts
sol2uml ../node_modules/@openzeppelin/contracts

## A contract on the Hoodi network
sol2uml 0x610866c6089768dA95524bcc4cE7dB61eDa3931c -v --network hoodi
## Proxy on Holesky
sol2uml 0x5fbe74a283f7954f10aa04c2edf55578811aeb03 -v --network holesky
## ApeChain using chain id
sol2uml 0xd22ba2ff50d5c086d4bc34e9612b92fcbf8c1152 -v --network 33139
