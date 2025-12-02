import { MUZICA_PROGRAM_ADDRESS } from '@project/anchor'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { ellipsify } from '@wallet-ui/react'

export function MuzicaUiProgramExplorerLink() {
  return <AppExplorerLink address={MUZICA_PROGRAM_ADDRESS} label={ellipsify(MUZICA_PROGRAM_ADDRESS)} />
}
