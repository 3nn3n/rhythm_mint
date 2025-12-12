import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

/**
 * Script to create a local USDC mint for testing on localnet
 * Run with: ts-node scripts/setup-usdc-mint.ts
 */

async function main() {
  // Connect to localnet
  const connection = new Connection('http://127.0.0.1:8899', 'confirmed');
  
  // Load your wallet keypair
  const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log('Wallet:', walletKeypair.publicKey.toBase58());
  
  // Create USDC mint (6 decimals like real USDC)
  console.log('\n🏦 Creating USDC mint...');
  const mint = await createMint(
    connection,
    walletKeypair,
    walletKeypair.publicKey, // mint authority
    null, // freeze authority (none)
    6 // decimals
  );
  
  console.log('✅ USDC Mint created:', mint.toBase58());
  
  // Create token account for your wallet
  console.log('\n💰 Creating token account for your wallet...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    walletKeypair,
    mint,
    walletKeypair.publicKey
  );
  
  console.log('✅ Token account:', tokenAccount.address.toBase58());
  
  // Mint 10 million USDC to your wallet
  const amount = 10_000_000 * 1_000_000; // 10 million USDC with 6 decimals
  console.log('\n💸 Minting 10,000,000 USDC to your wallet...');
  await mintTo(
    connection,
    walletKeypair,
    mint,
    tokenAccount.address,
    walletKeypair.publicKey,
    amount
  );
  
  console.log('✅ Minted 10,000,000 USDC');
  
  // Save mint address to a config file
  const config = {
    mint: mint.toBase58(),
    mintAuthority: walletKeypair.publicKey.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    createdAt: new Date().toISOString(),
  };
  
  const configPath = path.join(__dirname, '../.usdc-mint.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log('\n📝 Configuration saved to .usdc-mint.json');
  console.log('\n🎉 Setup complete!');
  console.log('\n📋 Summary:');
  console.log('   Mint Address:', mint.toBase58());
  console.log('   Your Token Account:', tokenAccount.address.toBase58());
  console.log('   Balance: 10,000,000 USDC');
  console.log('\n💡 Update your frontend to use this mint address');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
