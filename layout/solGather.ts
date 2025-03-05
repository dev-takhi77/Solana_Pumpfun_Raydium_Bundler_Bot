import { ComputeBudgetProgram, Keypair, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { mainMenuWaiting, outputBalance, readBundlerWallets, readJson } from "../src/utils";
import { cluster, connection } from "../config";
import { bundlerWalletName, bundleWalletNum } from "../settings"
import bs58 from 'bs58'
import { screen_clear } from "../menu/menu";
import { execute } from "../src/legacy";
import { createCloseAccountInstruction, getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";

const walletNum = bundleWalletNum

export const sol_gather = async () => {
    screen_clear()
    console.log(`Gathering Sol from ${bundleWalletNum} bundler wallets...`);

    const savedWallets = readBundlerWallets(bundlerWalletName)
    // console.log("🚀 ~ savedWallets: ", savedWallets)

    const walletKPs = savedWallets.map((wallet: string) => Keypair.fromSecretKey(bs58.decode(wallet)));
    const data = readJson()
    const LP_wallet_keypair = Keypair.fromSecretKey(bs58.decode(data.mainKp!))
    const batchLength = 5
    const batchNum = Math.ceil(bundleWalletNum / batchLength)
    let successNum = 0

    try {
        for (let i = 0; i < batchNum; i++) {
            const sendSolTx: TransactionInstruction[] = []
            sendSolTx.push(
                ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 })
            )
            for (let j = 0; j < batchLength; j++) {
                if ((i * batchLength + j) >= bundleWalletNum) continue;
                let solAmount = await connection.getBalance(walletKPs[i * batchLength + j].publicKey)
                const quoteAta = await getAssociatedTokenAddress(NATIVE_MINT, walletKPs[i * batchLength + j].publicKey)
                if (await connection.getAccountInfo(quoteAta))
                    sendSolTx.push(
                        createCloseAccountInstruction(
                            quoteAta,
                            walletKPs[i * batchLength + j].publicKey,
                            walletKPs[i * batchLength + j].publicKey
                        ),
                    )
                sendSolTx.push(
                    SystemProgram.transfer({
                        fromPubkey: walletKPs[i * batchLength + j].publicKey,
                        toPubkey: LP_wallet_keypair.publicKey,
                        lamports: solAmount
                        //  - 0.00001 * LAMPORTS_PER_SOL
                    })
                )
            }
            let index = 0
            while (true) {
                try {
                    if (index > 3) {
                        console.log("Error in gathering sol. Please retry gathering.")
                        mainMenuWaiting()
                        return
                    }
                    const siTx = new Transaction().add(...sendSolTx)
                    const latestBlockhash = await connection.getLatestBlockhash()
                    siTx.feePayer = LP_wallet_keypair.publicKey
                    siTx.recentBlockhash = latestBlockhash.blockhash
                    const messageV0 = new TransactionMessage({
                        payerKey: LP_wallet_keypair.publicKey,
                        recentBlockhash: latestBlockhash.blockhash,
                        instructions: sendSolTx,
                    }).compileToV0Message()
                    const transaction = new VersionedTransaction(messageV0)
                    const signers = walletKPs.slice(i * batchLength, bundleWalletNum > (i + 1) * batchLength ? (i + 1) * batchLength : bundleWalletNum)
                    transaction.sign(signers)
                    transaction.sign([LP_wallet_keypair])
                    console.log(await connection.simulateTransaction(transaction))
                    const txSig = await execute(transaction, latestBlockhash, 1)
                    const tokenBuyTx = txSig ? `https://solscan.io/tx/${txSig}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
                    if (txSig) {
                        successNum++
                        console.log("SOL gathered ", tokenBuyTx)
                    }
                    break
                } catch (error) {
                    index++
                    console.log(error)
                }
            }
        }
        if (successNum == batchNum) console.log("Successfully gathered sol from bundler wallets!")
    } catch (error) {
        console.log(error)
        console.log(`Failed to transfer SOL`)
    }
    await outputBalance(LP_wallet_keypair.publicKey)
    mainMenuWaiting()
}
