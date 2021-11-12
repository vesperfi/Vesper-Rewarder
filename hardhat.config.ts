import {HardhatUserConfig} from 'hardhat/types'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'
import 'hardhat-deploy'
import '@typechain/hardhat'
import 'hardhat-spdx-license-identifier'
import dotenv from 'dotenv'

dotenv.config()

const {NODE_URL, BLOCK_NUMBER} = process.env

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        url: NODE_URL!,
        blockNumber: BLOCK_NUMBER ? Number(BLOCK_NUMBER) : undefined,
      },
    },
    mainnet: {
      url: process.env.NODE_URL,
      chainId: 1,
      gas: 6700000,
      // accounts: {mnemonic: process.env.MNEMONIC},
    },
  },
  namedAccounts: {
    deployer: process.env.DEPLOYER || 0,
  },
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: 'typechain/hardhat',
    target: 'ethers-v5',
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  mocha: {
    timeout: 0,
  },
}

export default config
