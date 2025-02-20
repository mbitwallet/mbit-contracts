import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const MbitTokenModule = buildModule('MbitTokenModule', (m) => {
  const mbitToken = m.contract('MbitToken', ['Mbit Token', 'BIT'])
  const mbitTokenSale = m.contract('MbitTokenSale', [mbitToken, process.env.TOKEN_SALE_RECIPIENT_ADDRESS || ''])

  return { mbitToken, mbitTokenSale }
})

export default MbitTokenModule
