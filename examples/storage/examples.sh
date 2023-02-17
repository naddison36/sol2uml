
cd examples/storage
sol2uml storage ../../src/contracts -c BasicStorage
sol2uml storage ../../src/contracts -c DynamicArrayStorage
sol2uml storage ../../src/contracts -c MultiDynamicArrayStorage
sol2uml storage ../../src/contracts -c StructStorage
sol2uml storage ../../src/contracts -c StringStorage
sol2uml storage ../../src/contracts -c MappingStorage
sol2uml class ../../src/contracts/inheritance -c -f png -o ../inheritanceDiamond.png
sol2uml storage ../../src/contracts/inheritance -c D -o inheritanceStorage.svg

sol2uml storage -d -n arbitrum 0x8E2587265C68CD9EE3EcBf22DC229980b47CB960 -o BasicStorageData.svg
sol2uml storage -d -n arbitrum 0x796c008d8ADDCc33Da3e946Ca457432a35913c85 -o FixedArrayStorageData.svg
sol2uml storage -d -n arbitrum 0xe147cB7D90B9253844130E2C4A7Ef0ffB641C3ea -o MultiFixedArrayStorageData.svg
sol2uml storage -d -n arbitrum 0x66535378de7FB9219b637DBE3e3FFad33387f80B -o DynamicArrayStorageData.svg
sol2uml storage -d -n arbitrum 0x6f44d1108bB79710C1BBE378661d90876682E027 -o MultiDynamicArrayStorageData.svg
sol2uml storage -d -n arbitrum 0xB8F98C34e40E0D201CE2F3440cE92d0B5c5CfFe2 -o StructStorageData.svg
sol2uml storage -d -n arbitrum 0xeF2A93be2beD1b577D460c347f82De1Ba8bD9861 -o StringStorageData.svg

# USDC
sol2uml storage 0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf -d -s 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 -o usdcData.svg
# mStable Emissions Controller
sol2uml storage 0xebfd9cD78510c591eDa8735D0F8a87414eF27A83
sol2uml storage 0xebfd9cD78510c591eDa8735D0F8a87414eF27A83 -d -s 0xBa69e6FC7Df49a3b75b565068Fb91ff2d9d91780
# mStable Staking contract for MTA/ETH 80/20 Balancer Pool Token (BPT)
sol2uml storage 0xc63a48d85CCE7C3bD4d18db9c0972a4D223e4193 -bn 16000000 -d -s 0xeFbe22085D9f29863Cfb77EEd16d3cC0D927b011 -o StakedTokenBPTData.svg
