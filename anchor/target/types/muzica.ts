/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/muzica.json`.
 */
export type Muzica = {
  "address": "9NVaiC6n62KnMtVYUCcfdDY1KdAFNyZmnopdhTcvHnwJ",
  "metadata": {
    "name": "muzica",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createEscrowAta",
      "discriminator": [
        203,
        225,
        65,
        46,
        132,
        152,
        224,
        108
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "escrowDeposit",
      "discriminator": [
        137,
        100,
        252,
        219,
        140,
        205,
        146,
        215
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "payerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "escrowDistribute",
      "discriminator": [
        130,
        202,
        39,
        127,
        212,
        7,
        91,
        213
      ],
      "accounts": [
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "trackAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "track"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "trackId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeTrack",
      "discriminator": [
        14,
        160,
        200,
        167,
        109,
        13,
        15,
        196
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "cid",
          "type": "string"
        },
        {
          "name": "masterHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "contributors",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "sharesBps",
          "type": {
            "vec": "u16"
          }
        }
      ]
    },
    {
      "name": "mintStemNft",
      "discriminator": [
        193,
        29,
        124,
        122,
        204,
        64,
        87,
        62
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "track",
          "writable": true
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  101,
                  109,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "track"
              },
              {
                "kind": "arg",
                "path": "nftIndex"
              }
            ]
          }
        },
        {
          "name": "recipientTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "nftIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stemMint",
      "discriminator": [
        200,
        99,
        1,
        221,
        243,
        249,
        7,
        7
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "stemMint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateShares",
      "discriminator": [
        31,
        59,
        15,
        141,
        227,
        50,
        179,
        253
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "track",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "trackId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "trackId",
          "type": "u64"
        },
        {
          "name": "newSharesBps",
          "type": {
            "vec": "u16"
          }
        },
        {
          "name": "contributors",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "track",
      "discriminator": [
        148,
        45,
        9,
        235,
        14,
        15,
        36,
        159
      ]
    }
  ],
  "events": [
    {
      "name": "escrowDeposited",
      "discriminator": [
        28,
        193,
        105,
        27,
        40,
        101,
        65,
        211
      ]
    },
    {
      "name": "sharesUpdated",
      "discriminator": [
        137,
        176,
        34,
        123,
        204,
        48,
        204,
        136
      ]
    },
    {
      "name": "stemNftMinted",
      "discriminator": [
        240,
        111,
        96,
        87,
        202,
        195,
        150,
        170
      ]
    },
    {
      "name": "trackInitialized",
      "discriminator": [
        46,
        194,
        227,
        253,
        7,
        65,
        17,
        144
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidArgs",
      "msg": "Invalid arguments provided"
    },
    {
      "code": 6001,
      "name": "invalidShareTotal",
      "msg": "Sum of shares must equal 10000 (100%)"
    },
    {
      "code": 6002,
      "name": "tooManyContributors",
      "msg": "Too many contributors provided"
    },
    {
      "code": 6003,
      "name": "mathError",
      "msg": "Math overflow or division error"
    },
    {
      "code": 6004,
      "name": "tooManyStems",
      "msg": "Too many stems"
    },
    {
      "code": 6005,
      "name": "titleTooLong",
      "msg": "Title exceeds maximum length"
    },
    {
      "code": 6006,
      "name": "cidTooLong",
      "msg": "CID exceeds maximum length"
    },
    {
      "code": 6007,
      "name": "noContributors",
      "msg": "At least one contributor is required"
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Invalid amount: must be greater than 0"
    },
    {
      "code": 6009,
      "name": "invalidTokenAccountOwner",
      "msg": "Token account owner must be the track PDA"
    },
    {
      "code": 6010,
      "name": "invalidRecipientCount",
      "msg": "Recipient count must match contributor count"
    },
    {
      "code": 6011,
      "name": "notAContributor",
      "msg": "The signer is not a contributor to this track"
    }
  ],
  "types": [
    {
      "name": "escrowDeposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trackId",
            "type": "u64"
          },
          {
            "name": "depositor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "sharesUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trackId",
            "type": "u64"
          },
          {
            "name": "newShares",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "oldVersion",
            "type": "u32"
          },
          {
            "name": "newVersion",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "stemNftMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trackId",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "track",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "trackId",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "cid",
            "type": "string"
          },
          {
            "name": "masterHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "contributors",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "shares",
            "type": {
              "vec": "u16"
            }
          },
          {
            "name": "stemMints",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "royaltyVersion",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "trackInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "trackId",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "contributors",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "shares",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    }
  ]
};
