import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { UserToken } from './src/types';

// **************************************************** //
// ***************   SETTINGS   *********************** //
// **************************************************** //
// SD, You should set following values before you run the program.

// settings about token you are going to Mint
export const tokens: UserToken[] = [
  {
    name: '',
    symbol: '',
    decimals: 9,
    description: "Hello, World!",
    uiAmount: 10 ** 9,
    image: "./src/images/1.jpg",
    extensions: {
      website: "https://www.soldev.app/",
      twitter: "https://x.com/",
      telegram: "https://t.me/"
    },
    tags: [
      "Meme",
      "Tokenization"
    ],
    creator: {
      name: "",
      site: "https://www.soldev.app/"
    }
  }
]

// Main wallet to create token and pool, and so on
export const LP_wallet_private_key = "";
export const LP_wallet_keypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(LP_wallet_private_key)));

// amount of baseToken to put into the pool (0.5 is 50%, 1 is 100%)
export const input_baseMint_tokens_percentage = 1 //ABC-Mint amount of tokens you want to add in Lp e.g. 1 = 100%. 0.9= 90%

// amount of Sol to put into the Pool as liquidity
export let quote_Mint_amount =  0.01; //COIN-SOL, amount of SOL u want to add to Pool amount

// amount of Sol to bundle buy with three wallets (0.01 is 0.01sol)
export const swapSolAmount =  0.0001;

// number of wallets in each transaction
export const batchSize = 7

// number of wallets to bundle buy
export const bundleWalletNum = batchSize * 3

// name of file to save bundler wallets
export const bundlerWalletName = "wallets"

// percent of LP tokens to burn
export const burnLpQuantityPercent = 70   // 70 is 70% of total lp token supply

// whether you distribute the sol to existing wallets or new wallets
export const needNewWallets = true

export const swapSolAmounts : number[] = [
  0.011,  // wallet1
  0.012,  // wallet2
  0.013,  // wallet3
  0.014,  // wallet4
  0.015,  // wallet5
  0.016,  // wallet6
  0.017,  // wallet7
  0.018,  // wallet8
  0.019,  // wallet9
  0.011,  // wallet10
  0.012,  // wallet11
  0.013,  // wallet12
  0.014,  // wallet13
  0.015,  // wallet14
  0.016,  // wallet15
  0.017,  // wallet16
  0.018,  // wallet17
  0.019,  // wallet18
  0.011,  // wallet19
  0.012,  // wallet20
  0.013  // wallet21
]