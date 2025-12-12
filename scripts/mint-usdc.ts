import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

/**
 * Script to mint more USDC to any address
 * Run with: ts-node scripts/mint-usdc.ts <RECIPIENT_ADDRESS> <AMOUNT>
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: ts-node scripts/mint-usdc.ts <RECIPIENT_ADDRESS> <AMOUNT>');
    console.log('Example: ts-node scripts/mint-usdc.ts 9we6kjtbcZ2vy3GSLLsZTEhbAqXPTRvEyoxa8wxSqKp5 1000');
    process.exit(1);
  }
  
  const recipientAddress = args[0];
  const amount = parseFloat(args[1]);
  
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount');
    process.exit(1);
  }
  
  // Load USDC mint config
  const configPath = path.join(__dirname, '../.usdc-mint.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ USDC mint not set up. Run: npm run setup-usdc');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const mintPubkey = new PublicKey(config.mint);
  
  // Connect to localnet
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  
  // Load your wallet keypair (mint authority)
  const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log('Mint Authority:', walletKeypair.publicKey.toBase58());
  console.log('Mint Address:', mintPubkey.toBase58());
  
  // Get or create token account for recipient
  console.log('\n💰 Getting token account for recipient...');
  const recipientPubkey = new PublicKey(recipientAddress);
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    walletKeypair,
    mintPubkey,
    recipientPubkey
  );
  
  console.log('✅ Recipient token account:', tokenAccount.address.toBase58());
  
  // Mint tokens
  const mintAmount = Math.floor(amount * 1_000_000); // Convert to 6 decimals
  console.log(`\n💸 Minting ${amount} USDC...`);
  await mintTo(
    connection,
    walletKeypair,
    mintPubkey,
    tokenAccount.address,
    walletKeypair.publicKey,
    mintAmount
  );
  
  console.log(`✅ Minted ${amount} USDC to ${recipientAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
