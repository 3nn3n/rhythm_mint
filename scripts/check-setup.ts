import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function checkSetup() {
  const connection = new Connection('http://localhost:8899', 'confirmed');
  
  // Check if localnet is running
  try {
    const version = await connection.getVersion();
    console.log('✅ Localnet is running:', version);
  } catch (error) {
    console.error('❌ Localnet is not running. Start with: solana-test-validator');
    return;
  }
  
  // Check program deployment
  const programId = '9NVaiC6n62KnMtVYUCcfdDY1KdAFNyZmnopdhTcvHnwJ';
  const accountInfo = await connection.getAccountInfo(programId);
  
  if (accountInfo) {
    console.log('✅ Program is deployed on localnet');
  } else {
    console.log('❌ Program not found. Deploy with: anchor deploy');
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Make sure solana-test-validator is running');
  console.log('2. Switch Phantom to Custom RPC: http://localhost:8899');
  console.log('3. Airdrop SOL to your Phantom address:');
  console.log('   solana airdrop 10 YOUR_PHANTOM_ADDRESS --url localhost');
}

checkSetup().catch(console.error);
