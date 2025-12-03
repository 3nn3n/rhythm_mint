import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {Muzica}  from "../target/types/muzica";
import { describe, it, expect, vi, beforeAll } from "vitest";

vi.setConfig({ testTimeout: 600000 });



describe("muzica", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.Muzica as Program<Muzica>;
  let trackId: anchor.BN;
  let trackPda: anchor.web3.PublicKey;

  beforeAll(async () => {

    trackId = new anchor.BN(1);

    // Derive PDA with correct seeds: [b"track", authority, track_id]
    [trackPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("track"),
        wallet.publicKey.toBuffer(),
        new anchor.BN(trackId).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
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
        // track: trackPda is NOT needed - Anchor derives it automatically
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
        trackId,           // track_id parameter needed for PDA derivation
        stemMintPubkey     // stem_mint parameter
      )
      .accounts({
        authority: wallet.publicKey,
        // track is NOT needed - Anchor derives it from seeds
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

    const newSharesBps = [8000, 2000]; // change from 10000 to 8000

    const updateSharesIx = await program.methods
      .updateShares(
        trackId,          // track_id parameter needed for PDA derivation
        newSharesBps,
        [wallet.publicKey, wallet.publicKey] // contributors parameter
      )
      .accounts({
        authority: wallet.publicKey,
        // track is NOT needed - Anchor derives it from seeds
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




});