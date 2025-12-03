import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {Muzica}  from "../target/types/muzica";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress, createAccount, mintTo } from "@solana/spl-token";

vi.setConfig({ testTimeout: 600000 });



describe("muzica", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.Muzica as Program<Muzica>;
  let trackId: anchor.BN;
  let trackPda: anchor.web3.PublicKey;
  let mintPublicKey: anchor.web3.PublicKey;
  let escrowAta: anchor.web3.PublicKey;
  let payerTokenAccount: anchor.web3.PublicKey;

  beforeAll(async () => {

    trackId = new anchor.BN(1);

  
    [trackPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("track"),
        wallet.publicKey.toBuffer(),
        new anchor.BN(trackId).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    mintPublicKey = await createMint(
    provider.connection, 
    wallet.payer, 
    wallet.publicKey, 
    null, 
    9
  );

  
  escrowAta = await getAssociatedTokenAddress(
    mintPublicKey,      
    trackPda,         
    true              
  );

  payerTokenAccount = await createAccount(
      provider.connection,
      wallet.payer,
      mintPublicKey,
      wallet.publicKey
    );  

    await mintTo(
      provider.connection,
      wallet.payer,
      mintPublicKey,
      payerTokenAccount,
      wallet.payer,
      2_000_000
    );


  })


  it("initialize track", async () => {

    
    const initializeTrackIx = await program.methods
      .initializeTrack(
        trackId,
        "My First Track",
        "An awesome track", 
        Array(32).fill(0),
        [wallet.publicKey],
        [10000]
      )
      .accounts({
        authority: wallet.publicKey,
       
      })
      .instruction();


    let blockhashContext = await provider.connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      feePayer: wallet.publicKey,
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
    }).add(initializeTrackIx);

    const signedTx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      tx,
      [wallet.payer]
    );
    
    console.log("Transaction signature", signedTx);

    const trackAccount = await program.account.track.fetch(trackPda);
    console.log("Track Account:", trackAccount);
    
    expect(trackAccount.trackId.toNumber()).to.equal(1);
    expect(trackAccount.title).to.equal("My First Track");
    expect(trackAccount.cid).to.equal("An awesome track");
    expect(trackAccount.contributors.length).to.equal(1);
    expect(trackAccount.contributors[0].toBase58()).to.equal(wallet.publicKey.toBase58());
    expect(trackAccount.shares[0]).to.equal(10000);
  });

  it("stem mint", async () => {

    const stemMintPubkey = anchor.web3.Keypair.generate().publicKey;

    const stemMintIx = await program.methods
      .stemMint(
        trackId,           
        stemMintPubkey     
      )
      .accounts({
        authority: wallet.publicKey,
        
      })
      .instruction();

    let blockhashContext = await provider.connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      feePayer: wallet.publicKey,
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
    }).add(stemMintIx);

    const signedTx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      tx,
      [wallet.payer]
    );

    console.log("Transaction signature", signedTx);

    const trackAccount = await program.account.track.fetch(trackPda);
    console.log("Track Account:", trackAccount);

    expect(trackAccount.stemMints.length).to.equal(1);
    expect(trackAccount.stemMints[0].toBase58()).to.equal(stemMintPubkey.toBase58());
  });

  it("update shares", async () => {

    const newSharesBps = [8000, 2000]; 

    const updateSharesIx = await program.methods
      .updateShares(
        trackId,          
        newSharesBps,
        [wallet.publicKey, wallet.publicKey] 
      )
      .accounts({
        authority: wallet.publicKey,
      
      })
      .instruction();

    let blockhashContext = await provider.connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      feePayer: wallet.publicKey,
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
    }).add(updateSharesIx);

    const signedTx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      tx,
      [wallet.payer]
    );

    console.log("Transaction signature", signedTx);

    const trackAccount = await program.account.track.fetch(trackPda);
    console.log("Track Account:", trackAccount);

    expect(trackAccount.shares.length).to.equal(2);
    expect(trackAccount.shares[0]).to.equal(8000);
  });

it ("create escrow", async () => {


  const createEscrowIx = await program.methods
    .createEscrowAta(
      trackId,            
      wallet.publicKey    
    )
    .accounts({
      payer: wallet.publicKey,
      escrowTokenAccount: escrowAta,
      mint: mintPublicKey,
    })
    .instruction();

  let blockhashContext = await provider.connection.getLatestBlockhash();

  const tx = new anchor.web3.Transaction({
    feePayer: wallet.publicKey,
    blockhash: blockhashContext.blockhash,
    lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
  }).add(createEscrowIx);

  const signedTx = await anchor.web3.sendAndConfirmTransaction(
    provider.connection,
    tx,
    [wallet.payer]
  );

  console.log("Transaction signature", signedTx);

  let escrowAccountInfo = await provider.connection.getAccountInfo(escrowAta);
  console.log("Escrow Account Info:", escrowAccountInfo);

  expect(escrowAccountInfo).to.not.be.null;
});

  it ("deposit to escrow", async () => {

    

    const depositAmount = 1_000_000;

    const depositEscrowIx = await program.methods
      .escrowDeposit(
        new anchor.BN(depositAmount),
        trackId,               
        wallet.publicKey,    
      )
      .accounts({
        payer: wallet.publicKey,
        escrowTokenAccount: escrowAta,
        payerTokenAccount: payerTokenAccount,
      })
      .instruction();

    let blockhashContext = await provider.connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      feePayer: wallet.publicKey,
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
    }).add(depositEscrowIx);

    const signedTx = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      tx,
      [wallet.payer]
    );

    console.log("Transaction signature", signedTx);

    console.log("Deposited", depositAmount, "tokens to escrow account");
  
  });

});