import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { ethers } from 'hardhat'

const MbitTokenModule = buildModule('MbitTokenModule', (m) => {
  const mbitToken = m.contract('MbitToken', ['Mbit Token', 'BIT'])
  const mbitTokenSale = m.contract('MbitTokenSale', [mbitToken, process.env.TOKEN_SALE_RECIPIENT_ADDRESS || ''])

  m.call(mbitToken, 'grantRole', [ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE')), mbitTokenSale])

  return { mbitToken, mbitTokenSale }
})

export default MbitTokenModule
