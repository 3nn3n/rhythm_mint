// Muzica: Anchor program — Track Registry + Escrow Splitter + Helpers
// File: programs/muzica/src/lib.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Transfer, Token, SetAuthority, MintTo};
use anchor_spl::associated_token;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg1Kq3rYk7nX");

pub const MAX_TITLE_LEN: usize = 64;
pub const MAX_CID_LEN: usize = 128;
pub const MAX_CONTRIBUTORS: usize = 16; // configurable upper bound

#[program]
pub mod muzica {
    use super::*;

    /// Initialize a Track account (PDA) that stores metadata and contributor shares.


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

        track.authority = ctx.accounts.authority.key();
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

    /// Add a stem mint Pubkey to the track (e.g., minted by Metaplex or other mint flow)
    pub fn add_stem_mint(ctx: Context<ModifyTrack>, stem_mint: Pubkey) -> Result<()> {
        let track = &mut ctx.accounts.track;
        require!(track.stem_mints.len() < 64, ErrorCode::TooManyStems);
        track.stem_mints.push(stem_mint);
        Ok(())
    }

    /// Update contributor shares (replaces the shares vector). Requires authority signer.
    pub fn update_shares(ctx: Context<UpdateShares>, new_shares_bps: Vec<u16>) -> Result<()> {
        let track = &mut ctx.accounts.track;
        require!(new_shares_bps.len() == track.contributors.len(), ErrorCode::InvalidArgs);
        let sum: u64 = new_shares_bps.iter().map(|s| *s as u64).sum();
        require!(sum == 10000, ErrorCode::InvalidShareTotal);
        
        let old_version = track.royalty_version;
        track.shares = new_shares_bps.clone();
        track.royalty_version = track.royalty_version.checked_add(1).unwrap();
        
        emit!(SharesUpdated {
            track_id: track.track_id,
            new_shares: new_shares_bps,
            old_version,
            new_version: track.royalty_version,
        });
        
        Ok(())
    }

    /// Create the PDA-owned Associated Token Account (escrow) for a given mint.
    /// The payer funds account creation and will be charged rent; the resulting ATA will be owned by the PDA.
    pub fn create_escrow_ata(ctx: Context<CreateEscrowAta>) -> Result<()> {
        // Use associated token CPI to create the ATA for the track PDA and provided mint.
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
        anchor_spl::associated_token::create(cpi_ctx)?;
        Ok(())
    }

    /// Deposit SPL tokens into the Track-specific escrow token account (PDA-owned).
    /// The caller must own/signer of payer_token_account.
    pub fn deposit_to_escrow(ctx: Context<DepositToEscrow>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(
            ctx.accounts.escrow_token_account.owner == ctx.accounts.track.key(),
            ErrorCode::InvalidTokenAccountOwner
        );
        
        // Transfer SPL tokens from payer_token_account to escrow_token_account (PDA-owned)
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.payer_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        emit!(DepositMade {
            track_id: ctx.accounts.track.track_id,
            depositor: ctx.accounts.payer_authority.key(),
            amount,
            mint: ctx.accounts.escrow_token_account.mint,
        });
        
        Ok(())
    }

    /// Distribute funds from escrow to contributors according to shares. Only authority may call.
    /// This withdraws tokens from escrow_token_account (PDA-owned) into each recipient token account.
    pub fn distribute_from_escrow(ctx: Context<DistributeFromEscrow>, amount: u64) -> Result<()> {
        let track = &ctx.accounts.track;
        // total shares must be 10000 (validated at init/update)
        let total_bps: u64 = track.shares.iter().map(|s| *s as u64).sum();
        require!(total_bps == 10000, ErrorCode::InvalidShareTotal);


        // For each contributor, compute allocation and transfer from escrow PDA token account
        for (i, _contributor) in track.contributors.iter().enumerate() {
        let share = track.shares[i] as u64;
        let pay_amount = amount
        .checked_mul(share)
        .ok_or(ErrorCode::MathError)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathError)?;


        if pay_amount == 0 {
        continue; // skip zero allocations
        }


        // CPI: Transfer from escrow_token_account to recipient_token_accounts[i]
        let seeds = &[b"track", &track.track_id.to_le_bytes(), &[track.bump]];
        let signer = &[&seeds[..]];


        let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_accounts[i].to_account_info(),
        authority: ctx.accounts.track.to_account_info(), // PDA as authority
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, pay_amount)?;
        }


        Ok(())
    }

    /// Mint a Stem NFT using an existing mint account. Flow:
    /// 1) The client creates the mint with `payer` as initial mint authority.
    /// 2) Client calls this instruction providing the mint and recipient ATA.
    /// 3) This instruction sets the mint authority to the Track PDA (via CPI SetAuthority signed by payer),
    ///    then mints 1 token to the recipient ATA with the PDA as authority (signed via PDA seeds).
    pub fn mint_stem_nft(ctx: Context<MintStemNft>) -> Result<()> {
        let track = &ctx.accounts.track;

        // 1) Set mint authority to Track PDA (current authority is payer_authority signer)
        let cpi_accounts = SetAuthority {
            account_or_mint: ctx.accounts.mint.to_account_info(),
            current_authority: ctx.accounts.payer_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::set_authority(
            cpi_ctx,
            anchor_spl::token::spl_token::instruction::AuthorityType::MintTokens,
            Some(ctx.accounts.track.key()), // new mint authority = track PDA
        )?;
        // 2) Mint 1 token to recipient ATA with PDA as signer
        let track_id_bytes = track.track_id.to_le_bytes();
        let seeds = &[b"track".as_ref(), track_id_bytes.as_ref(), &[track.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts_mint = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.track.to_account_info(),
        };
        let cpi_program_mint = ctx.accounts.token_program.to_account_info();
        let cpi_ctx_mint = CpiContext::new_with_signer(cpi_program_mint, cpi_accounts_mint, signer);
        token::mint_to(cpi_ctx_mint, 1)?;
        
        emit!(StemNftMinted {
            track_id: track.track_id,
            mint: ctx.accounts.mint.key(),
            recipient: ctx.accounts.recipient_token_account.owner,
        });

        Ok(())
    }
}

// ---------- Accounts ----------

#[account]
pub struct Track {
    pub authority: Pubkey,
    pub track_id: u64,
    pub title: String,
    pub cid: String,
    pub master_hash: [u8; 32],
    pub contributors: Vec<Pubkey>,
    pub shares: Vec<u16>,
    pub stem_mints: Vec<Pubkey>,
    pub royalty_version: u32,
    pub bump: u8,
}

impl Track {
    // conservative size calculation for account initialization
    pub const LEN: usize = 8 // discriminator
        + 32 // authority
        + 8 // track_id
        + 4 + MAX_TITLE_LEN // title (string prefix + bytes)
        + 4 + MAX_CID_LEN // cid
        + 32 // master_hash
        + 4 + (MAX_CONTRIBUTORS * 32) // contributors vec (max)
        + 4 + (MAX_CONTRIBUTORS * 2) // shares vec (u16)
        + 4 + (64 * 32) // stem_mints vec (allow up to 64 stems)
        + 4 // royalty_version
        + 1; // bump
}

#[derive(Accounts)]
#[instruction(track_id: u64)]
pub struct InitializeTrack<'info> {
    #[account(
        init,
        payer = authority,
        space = Track::LEN,
        seeds = [b"track".as_ref(), track_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub track: Account<'info, Track>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyTrack<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump, has_one = authority)]
    pub track: Account<'info, Track>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateShares<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump, has_one = authority)]
    pub track: Account<'info, Track>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateEscrowAta<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump)]
    pub track: Account<'info, Track>,

    /// CHECK: Associated Token Account (will be created) - pass the expected ATA address here
    #[account(mut)]
    pub escrow_token_account: UncheckedAccount<'info>,

    /// The mint for which the ATA will be created
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub associated_token_program: Program<'info, associated_token::AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToEscrow<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump)]
    pub track: Account<'info, Track>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>,
    pub payer_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeFromEscrow<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump, has_one = authority)]
    pub track: Account<'info, Track>,
    pub authority: Signer<'info>,

    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    // Recipient token accounts should be passed as remaining_accounts
}

#[derive(Accounts)]
pub struct MintStemNft<'info> {
    #[account(mut, seeds = [b"track", &track.track_id.to_le_bytes()], bump = track.bump)]
    pub track: Account<'info, Track>,

    /// The mint account (already created by client) with payer as current mint authority
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// The recipient token account (ATA) to receive the minted NFT
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Current mint authority who will sign the SetAuthority CPI
    pub payer_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ---------- Events ----------

#[event]
pub struct TrackInitialized {
    pub track_id: u64,
    pub authority: Pubkey,
    pub contributors: Vec<Pubkey>,
    pub shares: Vec<u16>,
}

#[event]
pub struct SharesUpdated {
    pub track_id: u64,
    pub new_shares: Vec<u16>,
    pub old_version: u32,
    pub new_version: u32,
}

#[event]
pub struct DepositMade {
    pub track_id: u64,
    pub depositor: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
}

#[event]
pub struct FundsDistributed {
    pub track_id: u64,
    pub total_amount: u64,
    pub mint: Pubkey,
    pub royalty_version: u32,
}

#[event]
pub struct StemNftMinted {
    pub track_id: u64,
    pub mint: Pubkey,
    pub recipient: Pubkey,
}

// ---------- Errors ----------

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

/*
Notes, caveats and next steps:

1) create_escrow_ata CPI: This instruction uses the associated token program CPI to create an ATA owned by the Track PDA.
   The client should compute the expected ATA address (using spl_associated_token_account::get_associated_token_address)
   and pass it as `escrow_token_account` (UncheckedAccount) along with the mint and payer.

2) mint_stem_nft flow: The client creates the mint account and sets payer as initial authority (standard mint creation flow).
   Then it calls `mint_stem_nft` providing the mint, recipient ATA, and payer_authority signer. This instruction sets the
   mint authority to the Track PDA and then mints 1 token to the recipient ATA signed by the PDA.

3) After minting, you can call `add_stem_mint` to register the mint Pubkey on the Track.

4) Security: The SetAuthority CPI requires the current authority (payer_authority) to sign. Ensure that the client signs
   the transaction with the mint authority key when calling mint_stem_nft.

5) Associated token program type: Anchor exposes `associated_token::AssociatedToken` as the program type used above. If your
   Anchor version differs, you can replace `Program<'info, associated_token::AssociatedToken>` with `AccountInfo` and use
   `CpiContext::new` with `associated_token::ID` as appropriate.

6) Tests & client scripts: Next recommended step is to add Anchor integration tests (TypeScript) that:
   - initialize_track
   - compute ATA for PDA & create it via create_escrow_ata
   - create a mint with payer as authority
   - call mint_stem_nft to set PDA authority and mint 1 token to ATA
   - add_stem_mint to register the mint on track
   - deposit SPL to escrow & distribute

If you'd like, I can now:
- write the Anchor TypeScript integration tests that exercise these flows, OR
- produce client-side example scripts in TypeScript showing the exact sequence of calls (including ATA derivation, mint creation, and CPI calls), OR
- update the Anchor program to also include a helper that creates a Mint account on-chain (so the client doesn't need to create the mint).

Pick one and I'll implement it next.

*/
