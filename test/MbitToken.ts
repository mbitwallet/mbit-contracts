import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

const OneMonth = BigInt('2592000')

function toWei(amount: string | number | bigint, decimals = 18) {
  return BigInt(amount) * BigInt(10) ** BigInt(decimals)
}

describe('MbitToken', function () {
  async function setupContractFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, preSeed, seed, priv, pub, team, staking, holders] = await ethers.getSigners()

    const name = 'Mbit Token'
    const symbol = 'BIT'
    const maxSupply = toWei('316988658')
    const mbitToken = await ethers.deployContract('MbitToken', [name, symbol])

    return {
      mbitToken,
      owner,
      otherAccount,
      name,
      symbol,
      maxSupply,
      preSeed,
      seed,
      priv,
      pub,
      team,
      staking,
      holders,
    }
  }

  describe('Deployment', function () {
    it('Should set the right name, symbol and decimals', async function () {
      const { mbitToken, name, symbol } = await loadFixture(setupContractFixture)
      expect(await mbitToken.name()).to.equal(name)
      expect(await mbitToken.symbol()).to.equal(symbol)
      expect(await mbitToken.decimals()).to.equal(18)
    })

    it('Should set the right total supply and max supply', async function () {
      const { mbitToken, maxSupply } = await loadFixture(setupContractFixture)
      expect(await mbitToken.totalSupply()).to.equal(0)
      expect(await mbitToken.MAX_SUPPLY()).to.equal(maxSupply)
    })

    it('Owner balance must equal 0', async function () {
      const { mbitToken, owner, maxSupply } = await loadFixture(setupContractFixture)
      expect(await mbitToken.balanceOf(owner)).to.equal(0)
    })
  })

  describe('Transactions', function () {
    it('transfer() check balance', async function () {
      const { mbitToken, owner, otherAccount } = await loadFixture(setupContractFixture)
      const amount = toWei(1000000)
      await mbitToken.mint(owner.address, amount)
      await expect(mbitToken.transfer(otherAccount.address, amount)).to.changeTokenBalances(
        mbitToken,
        [owner.address, otherAccount.address],
        [-amount, amount],
      )
    })

    it('transfer() check event', async function () {
      const { mbitToken, owner, otherAccount } = await loadFixture(setupContractFixture)
      const amounts = [1, toWei(1000000)]
      for (let i = 0; i < amounts.length; i++) {
        const amount = amounts[i]
        await mbitToken.mint(owner.address, amount)
        await expect(mbitToken.transfer(otherAccount.address, amount))
          .to.emit(mbitToken, 'Transfer')
          .withArgs(owner.address, otherAccount.address, amount)
      }
    })

    it('approve() check event', async function () {
      const { mbitToken, owner, otherAccount } = await loadFixture(setupContractFixture)
      const amounts = [1, toWei(1000000)]
      for (let i = 0; i < amounts.length; i++) {
        const amount = amounts[i]
        await mbitToken.mint(owner.address, amount)
        await expect(mbitToken.approve(otherAccount.address, amount))
          .to.emit(mbitToken, 'Approval')
          .withArgs(owner.address, otherAccount.address, amount)
      }
    })

    it('approve() check allowance', async function () {
      const { mbitToken, owner, otherAccount } = await loadFixture(setupContractFixture)
      const amounts = [1, toWei(1000000)]
      for (let i = 0; i < amounts.length; i++) {
        const amount = amounts[i]
        await mbitToken.mint(owner.address, amount)
        await mbitToken.approve(otherAccount.address, amount)
        expect(await mbitToken.allowance(owner.address, otherAccount.address)).to.equal(amount)
      }
    })

    it('transferFrom()', async function () {
      const { mbitToken, owner, otherAccount } = await loadFixture(setupContractFixture)
      const approvalAmount = toWei(1000000)
      const transferAmount = toWei(100)
      await mbitToken.mint(owner.address, approvalAmount)
      await mbitToken.approve(otherAccount.address, approvalAmount)
      await expect(
        mbitToken.connect(otherAccount).transferFrom(owner.address, otherAccount.address, transferAmount),
      ).to.changeTokenBalances(mbitToken, [owner.address, otherAccount.address], [-transferAmount, transferAmount])

      expect(await mbitToken.allowance(owner.address, otherAccount.address)).to.equal(approvalAmount - transferAmount)
    })

    it('mintWithVestingPlan() check at tge', async function () {
      const { mbitToken, owner, otherAccount, preSeed, seed } = await loadFixture(setupContractFixture)
      const latest = await time.latest()
      const vestingPlan = {
        tge: BigInt(latest + 10000),
        totalAmount: toWei('15849932'),
        tgeAmount: toWei('1109495'),
        basis: OneMonth,
        cliff: OneMonth * BigInt(2),
        duration: OneMonth * BigInt(41),
        beneficiary: preSeed.address,
      }
      await mbitToken.mintWithVestingPlan(vestingPlan)
      await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestingPlan.tgeAmount)).to.be.reverted
      await time.increaseTo(vestingPlan.tge)
      await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestingPlan.tgeAmount + BigInt(1))).to.be
        .reverted
      await expect(
        mbitToken.connect(preSeed).transfer(otherAccount.address, vestingPlan.tgeAmount),
      ).to.changeTokenBalances(
        mbitToken,
        [preSeed.address, otherAccount.address],
        [-vestingPlan.tgeAmount, vestingPlan.tgeAmount],
      )
    })

    it('mintWithVestingPlan() no normal balance lock', async function () {
      const { mbitToken, owner, otherAccount, preSeed, seed } = await loadFixture(setupContractFixture)
      const latest = await time.latest()
      const vestingPlan = {
        tge: BigInt(latest + 10000),
        totalAmount: toWei('15849932'),
        tgeAmount: toWei('1109495'),
        basis: OneMonth,
        cliff: OneMonth * BigInt(2),
        duration: OneMonth * BigInt(41),
        beneficiary: preSeed.address,
      }
      await mbitToken.mintWithVestingPlan(vestingPlan)
      expect(await mbitToken.balanceOf(preSeed.address)).to.equal(vestingPlan.totalAmount)
      expect(await mbitToken.lockedBalanceOf(preSeed.address)).to.equal(vestingPlan.totalAmount)
      expect(await mbitToken.transferableBalanceOf(preSeed.address)).to.equal(0)
      await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestingPlan.tgeAmount)).to.be.reverted
      const normalAmount = toWei(10)
      await mbitToken.mint(preSeed.address, normalAmount)
      await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, normalAmount + BigInt(1))).to.be.reverted
      await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, normalAmount)).to.changeTokenBalances(
        mbitToken,
        [preSeed.address, otherAccount.address],
        [-normalAmount, normalAmount],
      )
    })

    for (let i = 0; i < 42; i++) {
      it(`mintWithVestingPlan() check after cliff + ${i} months`, async function () {
        const { mbitToken, owner, otherAccount, preSeed } = await loadFixture(setupContractFixture)
        const latest = await time.latest()
        const vestingPlan = {
          tge: BigInt(latest + 10000),
          totalAmount: toWei('15849932'),
          tgeAmount: toWei('1109495'),
          basis: OneMonth,
          cliff: OneMonth * BigInt(2),
          duration: OneMonth * BigInt(41),
          beneficiary: preSeed.address,
        }

        const vestedAmount =
          i === 42
            ? vestingPlan.totalAmount
            : ((vestingPlan.totalAmount - vestingPlan.tgeAmount) / BigInt(42)) * BigInt(i) + vestingPlan.tgeAmount
        await mbitToken.mintWithVestingPlan(vestingPlan)
        await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestedAmount)).to.be.reverted
        await time.increaseTo(vestingPlan.tge + vestingPlan.cliff + BigInt(i - 1) * vestingPlan.basis)
        await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestedAmount + BigInt(1))).to.be.reverted
        await expect(mbitToken.connect(preSeed).transfer(otherAccount.address, vestedAmount)).to.changeTokenBalances(
          mbitToken,
          [preSeed.address, otherAccount.address],
          [-vestedAmount, vestedAmount],
        )
      })
    }
  })
})
