import {HardhatRuntimeEnvironment} from 'hardhat/types'
import {DeployFunction} from 'hardhat-deploy/types'
import {Address} from '../helper'
import {parseEther} from 'ethers/lib/utils'

const VesperRewarder = 'VesperRewarder'

const {MASTERCHEF_V2, VSP, VSP_ETH_SLP, VESPER_REWARDER_OWNER} = Address

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {getNamedAccounts, deployments} = hre
  const {deploy, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const VSP_WEEKLY_REWARD = parseEther('8000')
  const rewardPerSecond = VSP_WEEKLY_REWARD.div('7').div('24').div('3600')

  await deploy(VesperRewarder, {
    from: deployer,
    log: true,
    args: [MASTERCHEF_V2, VSP, rewardPerSecond, VSP_ETH_SLP],
  })

  // TODO
  // await execute(VesperRewarder, {from: deployer, log: true}, 'transferOwnership', VESPER_REWARDER_OWNER)
}

export default func
func.tags = [VesperRewarder]
