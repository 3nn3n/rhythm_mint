import { UiWalletAccount } from '@wallet-ui/react'

export function MuzicaUiCreate({ account }: { account: UiWalletAccount }) {
  return (
    <div className="text-sm text-muted-foreground">
      Connected as {account.address.slice(0, 8)}...
    </div>
  )
}
