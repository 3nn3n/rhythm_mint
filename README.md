# 🎵 Muzica - Decentralized Music Platform

**Muzica** is a next-generation decentralized music platform built on Solana blockchain, empowering artists to maintain full ownership, monetize their work transparently, and collaborate seamlessly.

## ✨ What is Muzica?

Muzica revolutionizes the music industry by providing artists with complete control over their creative work. Upload tracks, mint stem NFTs, manage revenue splits, and distribute royalties—all on-chain with full transparency.

### 🎯 Key Features

#### 🎚️ Digital Audio Workspace
- **Interactive DAW Interface**: Professional-grade landing page with playable tracks, mixer controls, and timeline visualization
- **Real-time Audio Playback**: Stream tracks directly from IPFS with transport controls (play, pause, stop)
- **4-Channel Mixer**: Control individual stems (Vocals, Drums, Bass, Synth) with volume and pan adjustments
- **Waveform Visualization**: Dynamic timeline showing audio progress and duration

#### 🎼 Track Management
- **Upload Tracks**: Store your music on IPFS/Pinata with metadata stored on-chain
- **Stem NFTs**: Mint individual stem files (drums, vocals, bass, etc.) as NFTs for contributors
- **Track Metadata**: Store title, artist, BPM, key, genre, and cover art CIDs

#### 💰 Revenue & Payments
- **Revenue Splits**: Define and manage contributor shares for each track
- **Escrow System**: Secure USDC deposits with automated distribution to contributors
- **Royalty Distribution**: Transparent on-chain payments based on defined splits
- **Payment History**: Track all deposits and distributions with complete transparency

#### 🖼️ NFT Marketplace
- **Mint NFTs**: Create NFTs for entire tracks or individual stems
- **Contributor Recognition**: Award stem NFTs to collaborators (producers, mixing engineers, vocalists)
- **Ownership Proof**: Immutable on-chain proof of creative contributions

#### 👥 Collaboration Tools
- **Multi-contributor Support**: Add producers, engineers, vocalists, and other collaborators
- **Role-based Shares**: Define percentage splits based on contributions
- **Transparent Attribution**: Every contributor is recorded on-chain

#### 📊 Analytics Dashboard
- **Track Performance**: View stats on tracks, royalties, NFTs, and artist activity
- **USDC Integration**: Setup and manage USDC token accounts for payments
- **Quick Stats**: Monitor 10K+ tracks, $2M+ in royalties, 50K+ NFTs minted

## 🛠️ Technology Stack

- **Blockchain**: Solana (high-speed, low-cost transactions)
- **Smart Contracts**: Anchor framework (Rust)
- **Frontend**: Next.js 14 + React + TypeScript
- **Styling**: Tailwind CSS with custom 12-color theme
- **Storage**: IPFS via Pinata Gateway
- **Wallet**: Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Payments**: USDC (SPL Token)

## 🚀 Getting Started

### Prerequisites
```bash
- Node.js 18+
- Solana CLI
- Anchor CLI
- A Solana wallet (Phantom, Solflare, etc.)
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/muzica.git
cd muzica
```

2. **Install dependencies**
```bash
npm install
```

3. **Build Anchor program**
```bash
cd anchor
anchor build
anchor deploy
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
```
Navigate to http://localhost:3000
```

## 📖 How It Works

### For Artists

1. **Connect Wallet**: Use Phantom or any Solana wallet
2. **Upload Track**: Add your music file, cover art, and metadata
3. **Set Revenue Splits**: Define how royalties are distributed among collaborators
4. **Mint NFTs**: Create NFTs for stems or the complete track
5. **Receive Payments**: Get paid in USDC automatically through escrow

### For Collaborators

1. **Get Added to Track**: Artist adds you with a defined share percentage
2. **Receive Stem NFT**: Mint proves your contribution (e.g., "Producer - 30%")
3. **Automatic Royalties**: Receive your share when escrow deposits are distributed

## 🎨 Color Palette

Muzica uses a carefully crafted 12-color palette for consistent branding:

- Primary Blue: `#5A9CB5`
- Sunshine Yellow: `#FACE68`
- Warm Orange: `#FAAC68`
- Coral Red: `#FA6868`
- Deep Navy: `#434E78`
- Slate Blue: `#607B8F`
- Light Gold: `#F7E396`
- Tangerine: `#E97F4A`
- Purple: `#473472`
- Ocean Blue: `#53629E`
- Sky Blue: `#87BAC3`
- Mint Green: `#D6F4ED`

## 📂 Project Structure

```
muzica/
├── anchor/              # Solana smart contracts
│   ├── programs/       # Anchor programs (Rust)
│   └── tests/          # Contract tests
├── src/
│   ├── app/            # Next.js pages
│   │   ├── track/      # Track management pages
│   │   ├── dashboard/  # Dashboard view
│   │   └── setup-usdc/ # USDC setup
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # shadcn/ui components
│   │   └── solana/     # Solana-specific components
│   └── features/       # Feature modules
│       ├── account/    # Account management
│       ├── cluster/    # Network selection
│       └── muzica/     # Core Muzica features
└── public/             # Static assets
```

## 🔐 Smart Contract Features

The Muzica Anchor program handles:

- ✅ Track initialization with metadata
- ✅ Stem NFT minting for contributors
- ✅ Revenue split management (up to 10 contributors)
- ✅ Escrow deposits in USDC
- ✅ Automated royalty distribution
- ✅ On-chain ownership verification

## 🌐 Deployment

### Devnet (Testing)
```bash
anchor deploy --provider.cluster devnet
npm run dev
```

### Mainnet
```bash
anchor deploy --provider.cluster mainnet
npm run build
npm run start
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Anchor](https://www.anchor-lang.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Solana Wallet Adapter
- IPFS & Pinata for decentralized storage

## 📧 Contact

For questions or support, reach out:

- Twitter: [@MuzicaHQ](https://twitter.com/MuzicaHQ)
- Discord: [Join our community](https://discord.gg/muzica)
- Email: support@muzica.io

---

**Muzica** - Own Your Sound. Control Your Royalties. Build Your Legacy. 🎵

