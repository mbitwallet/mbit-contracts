import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

const OneMonth = BigInt('2592000')

function toWei(amount: string | number | bigint, decimals = 18) {
  return BigInt(amount) * BigInt(10) ** BigInt(decimals)
}

describe('MbitTokenSale', function () {
  async function setupContractFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2] = await ethers.getSigners()

    const name = 'Mbit Token'
    const symbol = 'BIT'
    const maxSupply = toWei('316988658')
    const mbitToken = await ethers.deployContract('MbitToken', [name, symbol])
    const mbitTokenSale = await ethers.deployContract('MbitTokenSale', [mbitToken, owner.address])
    await mbitToken.grantRole(await mbitToken.MANAGER_ROLE(), mbitTokenSale)
    const usdt = await ethers.deployContract('StableToken', ['Tether USD', 'USDT', 6, toWei('1000000000', 6)])
    await usdt.mint(account1.address, toWei('1000000', 6))
    await usdt.mint(account2.address, toWei('1000000', 6))

    return {
      mbitToken,
      owner,
      account1,
      account2,
      name,
      symbol,
      maxSupply,
      mbitTokenSale,
      usdt,
    }
  }

  async function setupBatchFixture() {
    const latest = await time.latest()
    const batches = [
      {
        batchId: BigInt(1),
        batchStatus: BigInt(1),
        batch: {
          hardCap: toWei(15849932),
          start: BigInt(latest + 10000),
          end: BigInt(latest + 20000),
        },
        batchVestingPlan: {
          percentageDecimals: BigInt(0),
          tge: BigInt(latest + 100000),
          tgePercentage: BigInt(7),
          basis: OneMonth,
          cliff: OneMonth * BigInt(2),
          duration: OneMonth * BigInt(41),
        },
        batchPrice: BigInt('60000'), // 0.06 USDT
        paymentAmount: toWei(6, 6), // 6 USDT
        receiveAmount: toWei(100),
      },
      {
        batchId: BigInt(2),
        batchStatus: BigInt(1),
        batch: {
          hardCap: toWei(9509959),
          start: BigInt(latest + 30000),
          end: BigInt(latest + 40000),
        },
        batchVestingPlan: {
          percentageDecimals: BigInt(0),
          tge: BigInt(latest + 100000),
          tgePercentage: BigInt(7),
          basis: OneMonth,
          cliff: OneMonth * BigInt(2),
          duration: OneMonth * BigInt(35),
        },
        batchPrice: BigInt('80000'), // 0.08 USDT
        paymentAmount: toWei(8, 6), // 8 USDT
        receiveAmount: toWei(100),
      },
      {
        batchId: BigInt(3),
        batchStatus: BigInt(1),
        batch: {
          hardCap: toWei(15849932),
          start: BigInt(latest + 50000),
          end: BigInt(latest + 60000),
        },
        batchVestingPlan: {
          percentageDecimals: BigInt(0),
          tge: BigInt(latest + 100000),
          tgePercentage: BigInt(8),
          basis: OneMonth,
          cliff: OneMonth * BigInt(2),
          duration: OneMonth * BigInt(35),
        },
        batchPrice: BigInt('100000'), // 0.1 USDT
        paymentAmount: toWei(10, 6), // 10 USDT
        receiveAmount: toWei(100),
      },
      {
        batchId: BigInt(4),
        batchStatus: BigInt(1),
        batch: {
          hardCap: toWei(15849932),
          start: BigInt(latest + 70000),
          end: BigInt(latest + 80000),
        },
        batchVestingPlan: {
          percentageDecimals: BigInt(0),
          tge: BigInt(latest + 100000),
          tgePercentage: BigInt(10),
          basis: OneMonth,
          cliff: OneMonth * BigInt(2),
          duration: OneMonth * BigInt(17),
        },
        batchPrice: BigInt('200000'), // 0.2 USDT
        paymentAmount: toWei(20, 6), // 20 USDT
        receiveAmount: toWei(100),
      },
    ]

    return { batches }
  }

  describe('Deployment', function () {
    it('Should set the right sale token', async function () {
      const { mbitTokenSale, mbitToken } = await loadFixture(setupContractFixture)
      expect(await mbitTokenSale.saleToken()).to.equal(mbitToken)
    })

    it('Should set the right recipient', async function () {
      const { mbitTokenSale, owner } = await loadFixture(setupContractFixture)
      expect(await mbitTokenSale.recipient()).to.equal(owner.address)
    })

    it('Should set the right governance', async function () {
      const { mbitTokenSale, owner } = await loadFixture(setupContractFixture)
      expect(await mbitTokenSale.governance()).to.equal(owner.address)
    })
  })

  describe('Transactions', async function () {
    it('Only governance can set governance', async function () {
      const { mbitTokenSale, owner, account1 } = await loadFixture(setupContractFixture)
      await expect(mbitTokenSale.connect(account1).setGovernance(account1.address)).to.be.reverted
      expect(await mbitTokenSale.governance()).to.equal(owner.address)
      await mbitTokenSale.setGovernance(account1.address)
      expect(await mbitTokenSale.governance()).to.equal(account1.address)
      await mbitTokenSale.connect(account1).setGovernance(owner.address)
      expect(await mbitTokenSale.governance()).to.equal(owner.address)
    })

    it('Only governance can set operator', async function () {
      const { mbitTokenSale, account1 } = await loadFixture(setupContractFixture)
      await expect(mbitTokenSale.connect(account1).setOperator(account1.address, true)).to.be.reverted
      expect(await mbitTokenSale.isOperator(account1.address)).to.equal(false)
      await mbitTokenSale.setOperator(account1.address, true)
      expect(await mbitTokenSale.isOperator(account1.address)).to.equal(true)
      await mbitTokenSale.setOperator(account1.address, false)
      expect(await mbitTokenSale.isOperator(account1.address)).to.equal(false)
    })

    it('Only governance can set recipient', async function () {
      const { mbitTokenSale, owner, account1 } = await loadFixture(setupContractFixture)
      await expect(mbitTokenSale.connect(account1).setRecipient(account1.address)).to.be.reverted
      expect(await mbitTokenSale.recipient()).to.equal(owner.address)
      await mbitTokenSale.setRecipient(account1.address)
      expect(await mbitTokenSale.recipient()).to.equal(account1.address)
      await mbitTokenSale.setRecipient(owner.address)
      expect(await mbitTokenSale.recipient()).to.equal(owner.address)
    })

    it('Only governance can set sale token', async function () {
      const { mbitTokenSale, mbitToken, account1 } = await loadFixture(setupContractFixture)
      const newMbitToken = await ethers.deployContract('MbitToken', ['Mbit Token', 'BIT'])
      await expect(mbitTokenSale.connect(account1).setSaleToken(newMbitToken)).to.be.reverted
      expect(await mbitTokenSale.saleToken()).to.equal(await mbitToken.getAddress())
      await mbitTokenSale.setSaleToken(newMbitToken)
      expect(await mbitTokenSale.saleToken()).to.equal(await newMbitToken.getAddress())
    })

    it('Setup sale batches and purchase', async function () {
      const { mbitTokenSale, account1, usdt, mbitToken } = await loadFixture(setupContractFixture)
      const recipient = await mbitTokenSale.recipient()

      expect(await mbitTokenSale.usersContains(account1.address)).to.equal(false)

      const { batches } = await loadFixture(setupBatchFixture)
      let totalReceiveAmount = BigInt(0)
      for (let i = 0; i < batches.length; i++) {
        const { batchId, batch, batchVestingPlan, batchStatus, batchPrice, paymentAmount, receiveAmount } = batches[i]
        totalReceiveAmount += receiveAmount
        await mbitTokenSale.setBatch(batchId, batch)
        await mbitTokenSale.setBatchVestingPlan(batchId, batchVestingPlan)
        await mbitTokenSale.setBatchStatus(batchId, batchStatus)
        await mbitTokenSale.setBatchPrice(batchId, usdt, batchPrice)

        expect(await mbitTokenSale.batchInfo(batchId)).to.eql(Object.values(batch))
        expect(await mbitTokenSale.batchVestingPlan(batchId)).to.eql(Object.values(batchVestingPlan))
        expect(await mbitTokenSale.batchStatus(batchId)).to.eql(batchStatus)
        expect(await mbitTokenSale.batchPrice(batchId, usdt)).to.eql(batchPrice)

        await usdt.connect(account1).approve(mbitTokenSale, paymentAmount)
        await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.revertedWith(
          'The sale have not started yet',
        )
        await time.increaseTo(batch.start)
        await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.changeTokenBalances(
          usdt,
          [account1.address, recipient],
          [-paymentAmount, paymentAmount],
        )
        await time.increaseTo(batch.end)
        await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.revertedWith(
          'The sale ended',
        )

        expect(await mbitTokenSale.userAmountOfBatch(batchId, account1.address)).to.equal(receiveAmount)
        expect(await mbitTokenSale.userAmount(account1.address)).to.equal(totalReceiveAmount)
        expect(await mbitToken.balanceOf(account1.address)).to.equal(totalReceiveAmount)
        expect(await mbitToken.lockedBalanceOf(account1.address)).to.equal(totalReceiveAmount)

        const [tge, totalAmount, tgeAmount, basis, cliff, duration, beneficiary] = await mbitToken.vestingInfo(i)
        expect(beneficiary).to.equal(account1.address)
        expect(tge).to.equal(batchVestingPlan.tge)
        expect(totalAmount).to.equal(receiveAmount)
        expect(tgeAmount).to.equal(
          (receiveAmount * batchVestingPlan.tgePercentage) /
            (BigInt(100) * BigInt(10) ** batchVestingPlan.percentageDecimals),
        )
        expect(basis).to.equal(batchVestingPlan.basis)
        expect(cliff).to.equal(batchVestingPlan.cliff)
        expect(duration).to.equal(batchVestingPlan.duration)
      }

      expect(await mbitTokenSale.usersContains(account1.address)).to.equal(true)
    })
  })

  it('Cannot purchase when contract paused', async function () {
    const { mbitTokenSale, account1, usdt, mbitToken } = await loadFixture(setupContractFixture)
    const recipient = await mbitTokenSale.recipient()

    expect(await mbitTokenSale.usersContains(account1.address)).to.equal(false)

    const { batches } = await loadFixture(setupBatchFixture)
    let totalReceiveAmount = BigInt(0)
    for (let i = 0; i < batches.length; i++) {
      const { batchId, batch, batchVestingPlan, batchStatus, batchPrice, paymentAmount, receiveAmount } = batches[i]
      totalReceiveAmount += receiveAmount
      await mbitTokenSale.setBatch(batchId, batch)
      await mbitTokenSale.setBatchVestingPlan(batchId, batchVestingPlan)
      await mbitTokenSale.setBatchStatus(batchId, batchStatus)
      await mbitTokenSale.setBatchPrice(batchId, usdt, batchPrice)

      expect(await mbitTokenSale.batchInfo(batchId)).to.eql(Object.values(batch))
      expect(await mbitTokenSale.batchVestingPlan(batchId)).to.eql(Object.values(batchVestingPlan))
      expect(await mbitTokenSale.batchStatus(batchId)).to.eql(batchStatus)
      expect(await mbitTokenSale.batchPrice(batchId, usdt)).to.eql(batchPrice)

      await usdt.connect(account1).approve(mbitTokenSale, ethers.MaxUint256)
      await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.revertedWith(
        'The sale have not started yet',
      )
      await time.increaseTo(batch.start)
      await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.changeTokenBalances(
        usdt,
        [account1.address, recipient],
        [-paymentAmount, paymentAmount],
      )
      await mbitTokenSale.setPause(true)
      await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.revertedWith('Paused')
      await mbitTokenSale.setPause(false)
      await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.changeTokenBalances(
        usdt,
        [account1.address, recipient],
        [-paymentAmount, paymentAmount],
      )
      await time.increaseTo(batch.end)
      await expect(mbitTokenSale.connect(account1).purchase(batchId, usdt, paymentAmount)).to.revertedWith(
        'The sale ended',
      )
    }
  })
})
