import { ethers } from 'hardhat'

const OneMonth = BigInt('2592000')

function toWei(amount: string | number | bigint, decimals = 18) {
  return BigInt(amount) * BigInt(10) ** BigInt(decimals)
}

async function main() {
  const mbitTokenSaleContractAddress = '0x7D2C665A99BBA070DB67d87Ef148A6E7B3f860FA'
  const usdtAddress = '0xf3b0F2e5189fD6a4a85462072604151a1571c1E1'

  const mbitTokenSale = await ethers.getContractAt('MbitTokenSale', mbitTokenSaleContractAddress)

  const batches = [
    {
      batchId: BigInt(1),
      batchStatus: BigInt(1),
      batch: {
        hardCap: toWei(9509959),
        start: BigInt('1740910556'),
        end: BigInt(0),
      },
      batchVestingPlan: {
        percentageDecimals: BigInt(0),
        tge: BigInt('1740996956'),
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
      batchId: BigInt(2),
      batchStatus: BigInt(1),
      batch: {
        hardCap: toWei(15849932),
        start: BigInt('1740910556'),
        end: BigInt(0),
      },
      batchVestingPlan: {
        percentageDecimals: BigInt(0),
        tge: BigInt('1740996956'),
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
      batchId: BigInt(3),
      batchStatus: BigInt(1),
      batch: {
        hardCap: toWei(15849932),
        start: BigInt('1740910556'),
        end: BigInt(0),
      },
      batchVestingPlan: {
        percentageDecimals: BigInt(0),
        tge: BigInt('1740996956'),
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

  for (let i = 0; i < batches.length; i++) {
    const { batchId, batch, batchVestingPlan, batchStatus, batchPrice, paymentAmount, receiveAmount } = batches[i]

    const setBatch = await mbitTokenSale.setBatch(batchId, batch)
    console.log('setBatch start:', setBatch.hash)
    await setBatch.wait()
    console.log('setBatch confirmed:', setBatch.hash)

    const setBatchVestingPlan = await mbitTokenSale.setBatchVestingPlan(batchId, batchVestingPlan)
    console.log('setBatchVestingPlan start:', setBatchVestingPlan.hash)
    await setBatch.wait()
    console.log('setBatchVestingPlan confirmed:', setBatchVestingPlan.hash)

    const setBatchStatus = await mbitTokenSale.setBatchStatus(batchId, batchStatus)
    console.log('setBatchStatus start:', setBatchStatus.hash)
    await setBatch.wait()
    console.log('setBatchStatus confirmed:', setBatchStatus.hash)

    const setBatchPrice = await mbitTokenSale.setBatchPrice(
      batchId,
      usdtAddress,
      batchPrice,
    )
    console.log('setBatchPrice start:', setBatchPrice.hash)
    await setBatch.wait()
    console.log('setBatchPrice confirmed:', setBatchPrice.hash)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
