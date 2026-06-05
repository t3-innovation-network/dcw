import { StackScreenProps } from '@react-navigation/stack'
import { WalletApiMessage } from '../../lib/walletRequestApi'

export type ExchangeCredentialsNavigationParamList = {
  ExchangeCredentials: { message: WalletApiMessage }
}

export type ExchangeCredentialsProps = StackScreenProps<
  ExchangeCredentialsNavigationParamList,
  'ExchangeCredentials'
>
