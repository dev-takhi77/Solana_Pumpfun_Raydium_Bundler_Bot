import { Keypair, PublicKey } from "@solana/web3.js"
import {
    NATIVE_MINT,
    getAssociatedTokenAddress,
} from '@solana/spl-token'
import { getSellTx } from "./swapOnlyAmm"
import { execute } from "./legacy"
import { connection, SWAP } from "../config"
import { sellInJupito } from "./jupitoBuy"


/**
 * @func sell
 * @description 'sell token'
 * @param poolId: PublicKey 'pool addr'
 * @param baseMint: PublicKey 'token addr'
 * @param wallet: Keypair 'subwallet keypair'
 */
export const sell = async (poolId: PublicKey, baseMint: PublicKey, wallet: Keypair) => {

    let i = 0
    while (true) {

        console.log('sell')
        i++;
        if (i == 10000) return 0
        try {
            const tokenAta = await getAssociatedTokenAddress(baseMint, wallet.publicKey)
            const tokenBalInfo = await connection.getTokenAccountBalance(tokenAta)
            if (!tokenBalInfo) {
                return 0;
            }

            const tokenBalance = tokenBalInfo.value.amount
            try {
                switch (SWAP) {
                    case "RAY":
                        const sellTx = await getSellTx(connection, wallet, baseMint, NATIVE_MINT, tokenBalance, poolId.toBase58())
                        if (sellTx == null) {
                            continue
                        }
                        const latestBlockhashForSell = await connection.getLatestBlockhash()
                        const txSellSig = await execute(sellTx, latestBlockhashForSell, false)
                        const tokenSellTx = txSellSig ? `https://solscan.io/tx/${txSellSig}` : ''
                        const solBalance = await connection.getBalance(wallet.publicKey)

                        return 1
                    case "JUP":
                        console.log("JUP")
                        sellInJupito(baseMint, wallet)
                        return 1
                    default:
                        console.log("Input Swap Method RAY / JUP")
                        process.exit(1)
                }
            } catch (error) {
                continue;
            }
        }
        catch (error) {
            if (i == 500) {
                console.log("buy error :", error)
            }
            continue;
        }
    }

}
