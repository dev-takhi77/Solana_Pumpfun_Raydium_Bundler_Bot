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
import { getSellTx } from "../src/swapOnlyAmm";
import { mainMenuWaiting, readJson, sleep } from "../src/utils";
import { execute } from "../src/legacy";
import { rl } from "../menu/menu";

// let rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// })

const mainKp = LP_wallet_keypair
const mainPk = mainKp.publicKey
const data = readJson()

export const manualSell = async () => {
    try {
        const baseMint = new PublicKey(data.mint!)
        const poolId = new PublicKey(data.poolId!)
        const tokenAta = getAssociatedTokenAddressSync(baseMint, mainPk)
        const balance = (await connection.getTokenAccountBalance(tokenAta!)).value.uiAmount
        console.log("Total holding token balance: ", balance);
        const percentBal = balance! * 100 / 10 ** 9
        console.log("% of holding token in Total supply", percentBal, "%")
        console.log("Please input the % of the token to sell.")

        rl.question("\t[Percent of total supply] - Sell Amount : ", async (answer: string) => {
            let sellPercentAmount = parseFloat(answer);
            let tokenBalance = (sellPercentAmount * 10 ** 9 * 10 ** 9 / 100).toString()

            const sellTx = await getSellTx(connection, mainKp, baseMint, NATIVE_MINT, tokenBalance, poolId.toBase58())
            if (sellTx == null) {
                console.log("Fail to get the sell transaction in manual selling of the tokens")
                return
            }
            const latestBlockhashForSell = await connection.getLatestBlockhash()
            const txSellSig = await execute(sellTx, latestBlockhashForSell, false)
            const tokenSellTx = txSellSig ? `https://solscan.io/tx/${txSellSig}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
            console.log(tokenSellTx)
            await sleep(2000)
            const tokenBalanceAfterSell = await connection.getTokenAccountBalance(tokenAta)
            console.log("Remaining Total holding token balance: ", tokenBalanceAfterSell.value.uiAmount)
            mainMenuWaiting()
        })
    }
    catch (error) {
        console.log(error);
    }
}