// Muzica: Anchor program — Track Registry + Escrow Splitter + Helpers
// File: programs/muzica/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Transfer, Token, SetAuthority, MintTo};
use anchor_spl::associated_token;

declare_id!("9NVaiC6n62KnMtVYUCcfdDY1KdAFNyZmnopdhTcvHnwJ");

pub const MAX_TITLE_LEN: usize = 64;
pub const MAX_CID_LEN: usize = 128;
pub const MAX_CONTRIBUTORS: usize = 16; 

#[program]
pub mod muzica {
    use super::*;

  
    pub fn initialize_track(
        ctx: Context<InitializeTrack>,
        track_id: u64,
        title: String,
        cid: String,
        master_hash: [u8; 32],
        contributors: Vec<Pubkey>,
        shares_bps: Vec<u16>,
    ) -> Result<()> {
        let track = &mut ctx.accounts.track;

        require!(title.len() <= MAX_TITLE_LEN, ErrorCode::TitleTooLong);
        require!(cid.len() <= MAX_CID_LEN, ErrorCode::CidTooLong);
        require!(contributors.len() == shares_bps.len(), ErrorCode::InvalidArgs);
        require!(contributors.len() > 0, ErrorCode::NoContributors);
        require!(contributors.len() <= MAX_CONTRIBUTORS, ErrorCode::TooManyContributors);

        let sum: u64 = shares_bps.iter().map(|s| *s as u64).sum();
        require!(sum == 10000, ErrorCode::InvalidShareTotal);

        track.authority = *ctx.accounts.authority.key;
        track.track_id = track_id;
        track.title = title;
        track.cid = cid;
        track.master_hash = master_hash;
        track.contributors = contributors.clone();
        track.shares = shares_bps.clone();
        track.stem_mints = Vec::new();
        track.royalty_version = 0;
        track.bump = ctx.bumps.track;

        emit!(TrackInitialized {
            track_id,
            authority: track.authority,
            contributors,
            shares: shares_bps,
        });

        Ok(())
    }

    pub fn stem_mint(ctx: Context<StemMint>, track_id: u64, stem_mint: Pubkey) -> Result<()> {

        let track = &mut ctx.accounts.track;
        require!(track.track_id == track_id, ErrorCode::InvalidArgs);
        require!(track.stem_mints.len() < 64, ErrorCode::TooManyStems);
        track.stem_mints.push(stem_mint);

        Ok(())

    }

    pub fn update_shares(ctx: Context<UpdateShares>, track_id: u64, new_shares_bps: Vec<u16>, contributors: Vec<Pubkey>) -> Result<()> {

        let track = &mut ctx.accounts.track;
        require!(track.track_id == track_id, ErrorCode::InvalidArgs);
        require!(new_shares_bps.len() == contributors.len(), ErrorCode::InvalidRecipientCount);

        let sum: u64 = new_shares_bps.iter().map(|s| *s as u64).sum();
        require!(sum == 10000, ErrorCode::InvalidShareTotal);

        let old_version = track.royalty_version;
        track.shares = new_shares_bps.clone();

        track.royalty_version = old_version.checked_add(1).unwrap();

        emit!(SharesUpdated {
            track_id: track.track_id,
            new_shares: new_shares_bps,
            old_version,
            new_version: track.royalty_version,
        });

        Ok(())

    }
}


    #[event]
    pub struct SharesUpdated {
        pub track_id: u64,
        pub new_shares: Vec<u16>,
        pub old_version: u32,
        pub new_version: u32,
    }

    #[derive(Accounts)]
    #[instruction(track_id: u64)]
    pub struct UpdateShares<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            mut,
            seeds = [
                b"track".as_ref(), 
                authority.key().as_ref(), 
                track_id.to_le_bytes().as_ref()
                ],
            bump,
        )]
        pub track: Account<'info, Track>,
    }



    #[derive(Accounts)]
    #[instruction(track_id: u64)]
    pub struct StemMint<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            mut,
            seeds = [
                b"track".as_ref(), 
                authority.key().as_ref(), 
                track_id.to_le_bytes().as_ref()
                ],
            bump,
        )]
        pub track: Account<'info, Track>,
    }

    #[event]
    pub struct TrackInitialized {
        pub track_id: u64,
        pub authority: Pubkey,
        pub contributors: Vec<Pubkey>,
        pub shares: Vec<u16>,
    }

    #[derive(Accounts)]
    #[instruction(track_id: u64)]
    pub struct InitializeTrack<'info>{

        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            init,
            payer = authority,
            space = Track::INIT_SPACE,
            seeds = [b"track".as_ref(), authority.key().as_ref(), &track_id.to_le_bytes().as_ref()],
            bump,
        )]
        pub track: Account<'info, Track>,
        
        pub system_program: Program<'info, System>,
    }

    #[account]
    #[derive(InitSpace)]
    pub struct Track {
        pub authority: Pubkey,
        pub track_id: u64,

        #[max_len(MAX_TITLE_LEN)]
        pub title: String,

        #[max_len(MAX_CID_LEN)]
        pub cid: String,
        pub master_hash: [u8; 32],

        #[max_len(MAX_CONTRIBUTORS * 32)]
        pub contributors: Vec<Pubkey>,

        #[max_len(MAX_CONTRIBUTORS * 2)]
        pub shares: Vec<u16>,

        #[max_len(64 * 32)]
        pub stem_mints: Vec<Pubkey>,
        pub royalty_version: u32,
        pub bump: u8,
    }

    #[error_code]
pub enum ErrorCode {
    #[msg("Invalid arguments provided")]
    InvalidArgs,
    #[msg("Sum of shares must equal 10000 (100%)")]
    InvalidShareTotal,
    #[msg("Too many contributors provided")]
    TooManyContributors,
    #[msg("Math overflow or division error")]
    MathError,
    #[msg("Too many stems")]
    TooManyStems,
    #[msg("Title exceeds maximum length")]
    TitleTooLong,
    #[msg("CID exceeds maximum length")]
    CidTooLong,
    #[msg("At least one contributor is required")]
    NoContributors,
    #[msg("Invalid amount: must be greater than 0")]
    InvalidAmount,
    #[msg("Token account owner must be the track PDA")]
    InvalidTokenAccountOwner,
    #[msg("Recipient count must match contributor count")]
    InvalidRecipientCount,
}       

