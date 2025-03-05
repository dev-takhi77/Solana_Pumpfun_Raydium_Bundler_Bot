import { cluster, connection } from "../config"
import base58 from "bs58"
import readline from "readline"
import {
    ComputeBudgetProgram,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction
} from "@solana/web3.js"
import {
    LiquidityPoolKeysV4,
    SPL_ACCOUNT_LAYOUT,
    TokenAccount
} from "@raydium-io/raydium-sdk";
import {
    NATIVE_MINT,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createCloseAccountInstruction,
    createTransferCheckedInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { LP_wallet_keypair } from "../settings";
import { getBuyTx, getSellTx } from "../src/swapOnlyAmm";
import { mainMenuWaiting, readHolderWalletDataJson, readJson, sleep } from "../src/utils";
import { execute } from "../src/legacy";
import { PoolKeys } from "../src/getPoolKeys";
import { rl } from "../menu/menu";
import { derivePoolKeys } from "../src/poolAll";

// let rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// })

const mainKp = LP_wallet_keypair
const mainPk = mainKp.publicKey
const data = readJson()

export const manualRebuy = async () => {
    try {
        if(!data.mint) {
            throw new Error("mint is not set yet.")
        }
        if(!data.poolId) {
            throw new Error("poolId is not set yet.")
        }
        const baseMint = new PublicKey(data.mint)
        const poolId = new PublicKey(data.poolId)
        const holderWallets = readHolderWalletDataJson()
        // const holderNum = holderWallets.length
        let totalBal = 0
        holderWallets.map(async({ pubkey }) => {
            let tokenAta = getAssociatedTokenAddressSync(baseMint, new PublicKey(pubkey))
            const balance = (await connection.getTokenAccountBalance(tokenAta)).value.uiAmount
            totalBal += balance!
        })
        await sleep(5000)
        console.log("Current Total holding token balance: ", totalBal);
        const percentBal = totalBal! * 100 / 10 ** 9
        console.log("% of holding token in Total supply", percentBal, "%")
        console.log("Please input the % of the token to buy.")

        const buyerAta = getAssociatedTokenAddressSync(baseMint, mainPk)

        rl.question("\t[Percent] - Buy Amount : ", async (answer: string) => {
            let buyPercentAmount = parseFloat(answer);
            let tokenBalance = buyPercentAmount * 10 ** 9 / 100
            // let poolKeys = await derivePoolKeys(poolId)
            
            // if(!poolKeys) {
            //     throw new Error("Fail to get poolKeys")
            // }
            const buyTx = await getBuyTx(connection, mainKp, baseMint, NATIVE_MINT, tokenBalance, poolId.toBase58())
            await sleep(2000)
            if (buyTx == null) {
                console.log("Fail to get the buy transaction in manual buying of the tokens")
                return
            }
            const latestBlockhashForBuy = await connection.getLatestBlockhash()
            const txBuySig = await execute(buyTx, latestBlockhashForBuy, true)
            const tokenBuyTx = txBuySig ? `https://solscan.io/tx/${txBuySig}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
            console.log(tokenBuyTx)
            const tokenBalanceAfterBuy = await connection.getTokenAccountBalance(buyerAta)
            console.log("Remaining Total holding token balance: ", tokenBalanceAfterBuy.value.uiAmount)
            mainMenuWaiting()
        })
    }
    catch (error) {
        console.log(error);
    }
}