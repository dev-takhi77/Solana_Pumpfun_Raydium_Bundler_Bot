# Solana Raydium Bundler & Pumpfun Bundler

This bot is designed to to create new token and launch new pool with new token and bundle buy with more than 20 wallets. You will be the first sniper and will buy your token in the same block.

## Features

- **Presimulation**: Estimate token amount and Sol amount needed for bundler wallets.
- **Token Creation**: Create new token with vanity address.
- **Launch New Pool**: Create Market in raydium and create pool in Raydium. Create new pool in Pumpfun.
- **Bundle Buy**: Buying with more than 20 wallets in the same block.

- **Sell Mode**: Gradually sells all tokens in sub-wallets through small transactions.
- **Token Pair Settings**: Configurable token mint and pool ID for swap operations.
- **Logging**: Supports adjustable logging levels for better monitoring and debugging.

## Environment Variables

The bot uses the following environment variables, which should be defined in a `.env` file:

```env
CLUSTER=devnet
MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=
MAINNET_WEBSOCKET_URL=wss://mainnet.helius-rpc.com/?api-key=

DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=
PINATA_API_KEY=
PINATA_SECRET_API_KEY=

# jito
BLOCKENGINE_URL=tokyo.mainnet.block-engine.jito.wtf
JITO_FEE=0.005

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
```

## Usage
1. Clone the repository
```
git clone https://github.com/PioSol7/Solana_Bundler_Bot.git
cd Solana_Bundler_Bot
```
2. Install dependencies
```
npm install
```
3. Configure the environment variables

Rename the .env.example file to .env and set RPC and WSS, main keypair's secret key and all settings in settings.ts file.

4. Run the bot

```
npm start
```


## Author

Discord: Takhi77 in discord

Telegram: [@Takhi777](https://t.me/@Takhi777)

You can always feel free to find me here for my help on other projects.
