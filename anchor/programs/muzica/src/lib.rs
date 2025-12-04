
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, SetAuthority, set_authority, mint_to, spl_token::instruction::AuthorityType};
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

    pub fn create_escrow_ata(ctx: Context<CreateEscrowAta>, track_id: u64, authority: Pubkey) -> Result<()> {

        require!(ctx.accounts.track.track_id == track_id, ErrorCode::InvalidArgs);
        require!(ctx.accounts.track.authority == authority, ErrorCode::InvalidArgs);

        let cpi_accounts = associated_token::Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.track.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };        

        let cpi_program = ctx.accounts.associated_token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        associated_token::create(cpi_ctx)?;

        Ok(())
    }

    pub fn escrow_deposit(ctx: Context<EscrowDeposit>, amount: u64, track_id: u64, authority: Pubkey) -> Result<()> {

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(ctx.accounts.track.track_id == track_id, ErrorCode::InvalidArgs);
        require!(ctx.accounts.track.authority == authority, ErrorCode::InvalidArgs);
        require!(ctx.accounts.escrow_token_account.owner == ctx.accounts.track.key(), ErrorCode::InvalidTokenAccountOwner);

            let cpi_accounts = Transfer {
                from: ctx.accounts.payer_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            anchor_spl::token::transfer(cpi_ctx, amount)?;

            emit!(EscrowDeposited {
                track_id: ctx.accounts.track.track_id,
                depositor: ctx.accounts.payer.key(),
                amount,
                mint: ctx.accounts.escrow_token_account.mint,
            });

        Ok(())
    }


    pub fn escrow_distribute<'info>(ctx: Context<'_, '_, '_, 'info, EscrowDistribute<'info>>, amount: u64, track_id: u64) -> Result<()> {

        //whenever you are reading from multiple accounts in a loop you have to clone the data you need first to avoid borrow checker issues
        // trust me i tried for 2 days

        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(ctx.accounts.track.track_id == track_id, ErrorCode::InvalidArgs);
        require!(ctx.accounts.escrow_token_account.owner == ctx.accounts.track.key(), ErrorCode::InvalidTokenAccountOwner);

        let track = &ctx.accounts.track;
        let total_bps: u64 = track.shares.iter().map(|s| *s as u64).sum();
        require!(total_bps == 10000, ErrorCode::InvalidShareTotal);

        // Clone all data we need. if you dont do it you run into borrow checker issues in the loop. like me
        let contributors = track.contributors.clone();
        let shares = track.shares.clone();
        let track_bump = track.bump;
        let escrow_mint = ctx.accounts.escrow_token_account.mint;

        // Get references to account infos
        let escrow_account_info = ctx.accounts.escrow_token_account.to_account_info();
        let track_account_info = ctx.accounts.track.to_account_info();
        let token_program_info = ctx.accounts.token_program.to_account_info();

        for (i, contributor) in contributors.iter().enumerate() {
            let share_bps = shares[i] as u64;
            let share_amount = amount * share_bps / 10000;

            if share_amount == 0 {
                continue;
            }

            let contributor_token_account = anchor_spl::associated_token::get_associated_token_address(
                contributor,
                &escrow_mint,
            );

            
            let to_account = ctx.remaining_accounts
                .iter()
                .find(|acc| acc.key() == contributor_token_account)
                .ok_or(ErrorCode::InvalidArgs)?;

            let authority_key = ctx.accounts.authority.key();
            let seeds = &[
                b"track".as_ref(),
                authority_key.as_ref(),
                &track_id.to_le_bytes(),
                &[track_bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: escrow_account_info.clone(),
                to: to_account.clone(),
                authority: track_account_info.clone(),
            };
            let cpi_ctx = CpiContext::new_with_signer(token_program_info.clone(), cpi_accounts, signer);
            anchor_spl::token::transfer(cpi_ctx, share_amount)?;
        }

        Ok(())
    }



    pub fn mint_stem_nft(ctx: Context<StemMintNFT>, track_id: u64, nft_index: u64) -> Result<()> {

        let track = &mut ctx.accounts.track;
        let track_authority = track.authority;
        let track_bump = track.bump;
        let mint_pubkey = ctx.accounts.mint.key();
        let recipient = ctx.accounts.authority.key();

        require!(track.track_id == track_id, ErrorCode::InvalidArgs);
        
        // Find the actual contributor index for the recipient
        let actual_index = track.contributors
            .iter()
            .position(|c| c == &recipient)
            .ok_or(ErrorCode::NotAContributor)? as u64;
        
        // Verify the passed index matches the actual contributor index
        require!(nft_index == actual_index, ErrorCode::InvalidArgs);

        let track_id_in_bytes = track_id.to_le_bytes();
        let seeds = &[
            b"track".as_ref(),
            track_authority.as_ref(),
            &track_id_in_bytes,
            &[track_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts_mint = anchor_spl::token::MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: track.to_account_info(),
        };

        let cpi_program_mint = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_mint = CpiContext::new_with_signer(
            cpi_program_mint,
            cpi_accounts_mint,
            signer,
        );
        mint_to(cpi_ctx_mint, 1)?;

        track.stem_mints.push(mint_pubkey);

        emit!(StemNFTMinted {
            track_id: track.track_id,
            mint: mint_pubkey,
            recipient: ctx.accounts.recipient_token_account.owner,
        });

        Ok(())
    
    }



}

    #[event]
    pub struct StemNFTMinted {
        pub track_id: u64,
        pub mint: Pubkey,
        pub recipient: Pubkey,
    }



    #[derive(Accounts)]
    #[instruction(track_id: u64, nft_index: u64)]
    pub struct StemMintNFT<'info> {

        #[account(mut)]
        pub payer: Signer<'info>,

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

        #[account(
            init,
            payer = payer,
            seeds = [
                b"stem_mint".as_ref(),
                track.key().as_ref(),
                &nft_index.to_le_bytes(),
            ],
            bump,
            mint::decimals = 0,
            mint::authority = track,
        )]
        pub mint: Account<'info, Mint>,

        #[account(
            init_if_needed,
            payer = payer,
            associated_token::mint = mint,
            associated_token::authority = authority,
        )]
        pub recipient_token_account: Account<'info, TokenAccount>,

        pub authority: Signer<'info>,

        pub token_program: Program<'info, Token>,
        pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
        pub system_program: Program<'info, System>,

    }


    #[derive(Accounts)]
    #[instruction(amount: u64, track_id: u64)]
    pub struct EscrowDistribute<'info> {

        #[account(
            mut,
            seeds = [
                b"track".as_ref(), 
                authority.key().as_ref(), 
                track_id.to_le_bytes().as_ref()
                ],
            bump,
            has_one = authority,
        )]
        pub track: Account<'info, Track>,

        #[account(mut)]
        pub escrow_token_account: Account<'info, TokenAccount>,

        ///CHECK: This is the PDA authority for the track
        #[account(
            seeds = [
                b"track".as_ref(), 
                authority.key().as_ref(), 
                track_id.to_le_bytes().as_ref()
                ],
            bump = track.bump
        )]
        pub track_authority: UncheckedAccount<'info>,

        pub authority: Signer<'info>,

        pub token_program: Program<'info, Token>,
    }



    #[event]
    pub struct EscrowDeposited {
        pub track_id: u64,
        pub depositor: Pubkey,
        pub amount: u64,
        pub mint: Pubkey,
    }

    #[derive(Accounts)]
    #[instruction(amount: u64, track_id: u64, authority: Pubkey)]
    pub struct EscrowDeposit<'info> {
        pub payer: Signer<'info>,

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

        #[account(mut)]
        pub escrow_token_account: Account<'info, TokenAccount>,

        #[account(mut)]
        pub payer_token_account: Account<'info, TokenAccount>,


        pub token_program: Program<'info, Token>,

    }



    #[derive(Accounts)]
    #[instruction(track_id: u64, authority: Pubkey)]
    pub struct CreateEscrowAta<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,

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

        ///CHECK: ATA for mint
        #[account(mut)]
        pub escrow_token_account: UncheckedAccount<'info>,

        pub mint: Account<'info, Mint>,

        pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
        pub token_program: Program<'info, Token>,
        pub system_program: Program<'info, System>,

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
    #[msg("The signer is not a contributor to this track")]
    NotAContributor,
}