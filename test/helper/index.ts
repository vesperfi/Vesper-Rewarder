import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {BigNumber} from 'ethers'
import {ethers, network} from 'hardhat'

export const impersonateAccount = async (address: string): Promise<SignerWithAddress> => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })
  await network.provider.request({
    method: 'hardhat_setBalance',
    params: [address, ethers.utils.hexStripZeros(ethers.utils.parseEther('10').toHexString())],
  })
  await network.provider.request({
    method: 'hardhat_setCode',
    params: [address, '0x00'],
  })
  return ethers.getSigner(address)
}

export const increaseTime = async (timeToIncrease: BigNumber): Promise<void> => {
  await ethers.provider.send('evm_increaseTime', [timeToIncrease.toNumber()])
  await ethers.provider.send('evm_mine', [])
}
