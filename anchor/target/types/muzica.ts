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
      "name": "initializeTrack",
      "docs": [
        "Initialize a Track account (PDA) that stores metadata and contributor shares."
      ],
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
    }
  ],
  "types": [
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
