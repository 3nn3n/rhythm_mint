# USDC Mint Setup for Local Testing

This directory contains scripts to set up a local USDC mint for testing the escrow payment system.

## Quick Start

### 1. Create Local USDC Mint

```bash
npx ts-node scripts/setup-usdc-mint.ts
```

This will:
- Create a new SPL token mint with 6 decimals (like real USDC)
- Create a token account for your wallet
- Mint 10,000,000 test USDC to your wallet
- Save the configuration to `.usdc-mint.json`

### 2. Mint More USDC to Any Address

```bash
npx ts-node scripts/mint-usdc.ts <RECIPIENT_ADDRESS> <AMOUNT>
```

Example:
```bash
npx ts-node scripts/mint-usdc.ts 9we6kjtbcZ2vy3GSLLsZTEhbAqXPTRvEyoxa8wxSqKp5 5000
```

## Update Your Frontend

After running `setup-usdc-mint.ts`, update the mint address in:

**`src/app/track/[id]/payments/page.tsx`**

```typescript
// Replace this line:
const [mint, setMint] = useState<string>('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// With your local mint from .usdc-mint.json:
const [mint, setMint] = useState<string>('YOUR_LOCAL_MINT_ADDRESS')
```

## Testing the Escrow Flow

1. **Setup:**
   ```bash
   npx ts-node scripts/setup-usdc-mint.ts
   ```

2. **Create a track with multiple contributors**

3. **Create escrow ATA for the track:**
   - Use the `create_escrow_ata` program instruction
   - Or add a button in the UI

4. **Deposit USDC to escrow:**
   - Use the payments page
   - Your wallet already has 10M USDC from step 1

5. **Distribute payments:**
   - The escrow will distribute to all contributors based on their shares

## Configuration File

`.usdc-mint.json` contains:
```json
{
  "mint": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "mintAuthority": "YourWalletPublicKey",
  "tokenAccount": "YourTokenAccountAddress",
  "createdAt": "2025-12-10T..."
}
```

## Notes

- This is for **localnet testing only**
- Each time you restart the validator, you'll need to run `setup-usdc-mint.ts` again
- The mint authority is your default Solana wallet (`~/.config/solana/id.json`)
- You can mint unlimited tokens for testing
