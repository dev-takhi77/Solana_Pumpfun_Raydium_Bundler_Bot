# Solana Raydium Bundler & Pumpfun Bundler

This bot is designed to to create new token and launch new pool with new token and bundle buy with more than 20 wallets. You will be the first sniper and will buy your token in the same block.

## Features

- **Presimulation**: Estimate token amount and Sol amount needed for bundler wallets.
- **Token Creation**: Create new token with vanity address.
- **Launch New Pool**: Create Market in raydium and create pool in Raydium. Create new pool in Pumpfun.
- **Bundle Buy**: Buying with more than 20 wallets in the same block.
- **Sell Mode**: Gradually sells all tokens in sub-wallets through small transactions or Sell at once from all sub-wallets.
- **Token CA Settings**: Configurable token mint with Vanity address.
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

## Extra Explanation

Settings.ts

tokens: you can set the name, symbol, decimals, description, uiAmount ....
In terms of constants of settings, there is explanation above in the settings.ts file.
swapSolAmounts : you can set the amount of solana for 21 wallets, so main wallet will deposit that amount of solana to those wallets, and bundler wallets will buy the token with that amount.
If you are not sure about settings, then don't change the value and leave it as default settings.

1. Create Token

This is the step for token creation to use in Pool creation.
To create the pool, you need to create the token first and deposit it to the new Pool in Raydium.

2. Create Market

This is the step for market creation for your pool.
This is also required step to create the pool in Raydium.

3. Security Checks

This is the step for raising the security of the token you created.
 - Remove Mint Authority
     This is the step for revoking the mint authority of the token, nobody cannot mint the token anymore.
 - Remove Freeze Authority
     This is the step for revoking the freeze authority of the token, nobody cannot freeze the AssociatedTokenAccounts of your token, so everybody can freely buy and sell your token.

4. Create Wallets to BundleBuy

This is the step for creating 21 bundler wallets to buy back your token from the pool you are launching.
In this step, you will transfer solana to those wallets and create Atas for token and Wsol.

5. Create LookUpTable

This is the step for creating LookUpTable.
LookUpTable is making the transaction size small, so can buy with 21 wallets.
If you buy back big portion of tokens with small number of wallets, then traders don't want to buy that token, cuz there is possibility of rug pull of that buyer.

6. Extend LookUpTable and Simulate

This is the step for adding account addresses which will used in transactions and simulate the success or failure of the transactions.

7. Create Pool and BundleBuy

This is the step for pool creation and bundle buy.

8. Burn LP token

This is the step for burning LP token of your pool.
This is also one of important step, cuz buyers will not buy if your pool didn't burn LP token, pool launcher will remove liquidity from the pool and get all Solana in the pool.
If you burn LP token, then you cannot remove liquidity.

9. Sell all tokens

This is the step for selling all tokens in your bundler wallets after the price of the token increases.

10. Gather Sol from bundler wallets

This is the step for gathering all solana and Wsol from bundler wallets.

(!Caution!)
Be careful of running the code, this is the bundler which requires good experience and patience.
You have to check the success of every step and then go to next step.
If you don't do like that, then you will get failure in the next step.
That's because you have some error in the previous steps.
And If you have problems in running, don't do like what want to do.
Please ask me.
I will check and find the reason of it.
Ofc, many clients are using this and have some difficulties to get familiar with this.
But after 2 or 3 times of successful running, then you will get used to it and will be happy.
If you have some inconvenience, then let me know, I will update it like what you want.

## Author

Discord: Takhi77 in discord

Telegram: [@Takhi777](https://t.me/@Takhi777)

You can always feel free to find me here for my help on other projects.
