/* eslint-disable camelcase */
import {parseEther} from '@ethersproject/units'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {expect} from 'chai'
import {BigNumber} from 'ethers'
import {ethers} from 'hardhat'
import {
  VesperRewarder,
  VesperRewarder__factory,
  MasterChefV2,
  MasterChefV2__factory,
  IERC20,
  IERC20__factory,
} from '../typechain'
import {impersonateAccount, increaseTime} from './helper'

const VSP_ETH_SLP_ADDRESS = '0x132eEb05d5CB6829Bd34F552cDe0b6b708eF5014'
const SLP_HOLDER = '0xdbc13e67f678cc00591920cece4dca6322a79ac7'
const MASTERCHEF_V2 = '0xef0881ec094552b2e128cf945ef17a6752b4ec5d'
const VSP_ADDRESS = '0x1b40183efb4dd766f11bda7a7c3ad8982e998421'
const MASTERCHEF_V2_OWNER = '0x19b3eb3af5d93b77a5619b047de0eed7115a19e7'
const VSP_HOLDER = '0xba4cfe5741b357fa371b506e5db0774abfecf8fc'

const VSP_WEEKLY_REWARD = parseEther('8000')
const ONE_WEEK_IN_SEC = BigNumber.from(60 * 60 * 24 * 7)

describe('VesperRewarder', function () {
  let snapshotId: string
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let sushiAdmin: SignerWithAddress
  let vsp: IERC20
  let slp: IERC20
  let slpHolder: SignerWithAddress
  let vspHolder: SignerWithAddress
  let rewarder: VesperRewarder
  let masterChefV2: MasterChefV2
  let pid: BigNumber

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[owner, user] = await ethers.getSigners()
    sushiAdmin = await impersonateAccount(MASTERCHEF_V2_OWNER)
    slpHolder = await impersonateAccount(SLP_HOLDER)
    vspHolder = await impersonateAccount(VSP_HOLDER)

    vsp = IERC20__factory.connect(VSP_ADDRESS, vspHolder)
    slp = IERC20__factory.connect(VSP_ETH_SLP_ADDRESS, slpHolder)
    masterChefV2 = MasterChefV2__factory.connect(MASTERCHEF_V2, sushiAdmin)

    const rewarderFactory = new VesperRewarder__factory(owner)
    const rewardPerSecond = VSP_WEEKLY_REWARD.div('7').div('24').div('60').div('60')
    rewarder = await rewarderFactory.deploy(MASTERCHEF_V2, VSP_ADDRESS, rewardPerSecond, VSP_ETH_SLP_ADDRESS)

    // Setup VSP in MasterChefV2
    const tx = await masterChefV2.add('8', VSP_ETH_SLP_ADDRESS, rewarder.address)
    const receipt = await tx.wait()
    ;[pid] = receipt.events![0].args!
  })

  afterEach(async function () {
    snapshotId = await ethers.provider.send('evm_revert', [snapshotId])
  })

  describe('onSushiReward', function () {
    describe('when just one user staked all SLPs', function () {
      beforeEach('Stake SLP to V2', async function () {
        const slpToDeposit = await slp.balanceOf(slpHolder.address)
        await slp.approve(masterChefV2.address, ethers.constants.MaxUint256)
        masterChefV2 = masterChefV2.connect(slpHolder)
        await masterChefV2.deposit(pid, slpToDeposit, slpHolder.address)

        // Travel one week
        await increaseTime(ONE_WEEK_IN_SEC)
      })

      describe('when VesperRewarder has enough VSP', function () {
        beforeEach(async function () {
          await vsp.transfer(rewarder.address, parseEther('1000000')) // 1MM VSP
        })

        it('should receive correct amount ', async function () {
          // given
          const vspBalanceBefore = await vsp.balanceOf(slpHolder.address)
          const pending = await rewarder.pendingToken(slpHolder.address)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expect(pending).closeTo(VSP_WEEKLY_REWARD, parseEther('0.5'))

          // when
          const {amount} = await masterChefV2.userInfo(pid, slpHolder.address)
          await masterChefV2.withdraw(pid, amount, slpHolder.address)

          // then
          const vspBalanceAfter = await vsp.balanceOf(slpHolder.address)
          const vspReceived = vspBalanceAfter.sub(vspBalanceBefore)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expect(vspReceived).closeTo(VSP_WEEKLY_REWARD, parseEther('0.5'))
        })

        it('should receive correct amount when calling more than one time', async function () {
          // given
          const {amount: amountStaked} = await masterChefV2.userInfo(pid, slpHolder.address)
          const half = amountStaked.div('2')
          const tx1 = () => masterChefV2.withdraw(pid, half, slpHolder.address)
          await expect(tx1).changeTokenBalance(vsp, slpHolder, '8000026455026454715936') // receive all weekly VSPs

          // when
          const tx2 = () => masterChefV2.withdraw(pid, half, slpHolder.address)

          // then
          // receive close to nothing just after
          await expect(tx2).changeTokenBalance(vsp, slpHolder, '13227513227513139')
        })

        it('should receive correct amount after changing rewardPerSecond value', async function () {
          // given
          const newRewardPerSecond = (await rewarder.rewardPerSecond()).div('2')
          await rewarder.updateRewardPerSecond(newRewardPerSecond)
          const vspBalanceBefore = await vsp.balanceOf(slpHolder.address)

          // when
          const {amount: amountStaked} = await masterChefV2.userInfo(pid, slpHolder.address)
          await masterChefV2.withdraw(pid, amountStaked, slpHolder.address)

          // then
          const vspBalanceAfter = await vsp.balanceOf(slpHolder.address)
          const vspReceived = vspBalanceAfter.sub(vspBalanceBefore)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expect(vspReceived).closeTo(VSP_WEEKLY_REWARD.div('2'), parseEther('0.5'))
        })
      })

      describe('when VesperRewarder has not enough VSP', function () {
        it('should receive correct amount', async function () {
          // given
          const pendingBefore = await rewarder.pendingToken(slpHolder.address)
          const rewarderBalance = pendingBefore.div('2')
          await vsp.transfer(rewarder.address, rewarderBalance)
          const vspBalanceBefore = await vsp.balanceOf(slpHolder.address)

          // when
          const {amount} = await masterChefV2.userInfo(pid, slpHolder.address)
          await masterChefV2.withdraw(pid, amount, slpHolder.address)

          // then
          const pendingAfter = await rewarder.pendingToken(slpHolder.address)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expect(pendingAfter).closeTo(pendingBefore.div('2'), parseEther('0.5'))
          const vspBalanceAfter = await vsp.balanceOf(slpHolder.address)
          const vspReceived = vspBalanceAfter.sub(vspBalanceBefore)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          expect(vspReceived).eq(rewarderBalance)
        })
      })
    })

    describe('when have more than one staker', function () {
      beforeEach('Stake SLP to V2', async function () {
        const totalSlp = await slp.balanceOf(slpHolder.address)
        const halfSlp = totalSlp.div('2')
        await slp.transfer(user.address, halfSlp)

        await slp.approve(masterChefV2.address, ethers.constants.MaxUint256)
        await masterChefV2.connect(slpHolder).deposit(pid, halfSlp, slpHolder.address)

        await slp.connect(user).approve(masterChefV2.address, ethers.constants.MaxUint256)
        await masterChefV2.connect(user).deposit(pid, halfSlp, user.address)

        // Travel one week
        await increaseTime(ONE_WEEK_IN_SEC)
      })

      it('should calculate VSP pending properly', async function () {
        const pendingSlpHolder = await rewarder.pendingToken(slpHolder.address)
        const pendingUser = await rewarder.pendingToken(slpHolder.address)

        const halfOfRewards = VSP_WEEKLY_REWARD.div('2')

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(pendingSlpHolder).closeTo(halfOfRewards, parseEther('0.5'))
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(pendingUser).closeTo(halfOfRewards, parseEther('0.5'))
      })
    })
  })

  describe('updateRewardPerSecond', function () {
    it('should revert when caller is not owner', async function () {
      const tx = rewarder.connect(slpHolder).updateRewardPerSecond('0')
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it('should update rewardPerSecond value', async function () {
      // given
      const rewardPerSecond = await rewarder.rewardPerSecond()
      expect(rewardPerSecond).gt('0')

      // when
      const newRewardPerSecond = rewardPerSecond.mul('2')
      const tx = rewarder.updateRewardPerSecond(newRewardPerSecond)

      // then
      await expect(tx).emit(rewarder, 'RewardPerSecondUpdated').withArgs(newRewardPerSecond)
      expect(await rewarder.rewardPerSecond()).eq(newRewardPerSecond)
    })
  })
})
