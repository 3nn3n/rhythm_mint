import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { AppHero } from '@/components/app-hero'
import { MuzicaUiProgramExplorerLink } from './ui/muzica-ui-program-explorer-link'
import { MuzicaUiCreate } from './ui/muzica-ui-create'
import { MuzicaUiProgram } from '@/features/muzica/ui/muzica-ui-program'

export default function MuzicaFeature() {
  const { account } = useSolana()

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletDropdown />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppHero title="Muzica" subtitle={'Run the program by clicking the "Run program" button.'}>
        <p className="mb-6">
          <MuzicaUiProgramExplorerLink />
        </p>
        <MuzicaUiCreate account={account} />
      </AppHero>
      <MuzicaUiProgram />
    </div>
  )
}
