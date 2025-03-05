import { AuthorityType, createSetAuthorityInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, Transaction, Keypair, ComputeBudgetProgram } from '@solana/web3.js';
import bs58 from 'bs58'
import { PoolInfo } from './types';
import { readJson, securityCheckWaiting, sleep } from './utils';
import { cluster, connection } from '../config';
import { sendAndConfirmTransaction } from '@solana/web3.js';

export const revokeMintAuthority = async () => {
    let params: PoolInfo
    try {
        const data = readJson()

        params = {
            mint: data.mint ? new PublicKey(data.mint) : null,
            marketId: data.marketId ? new PublicKey(data.marketId) : null,
            poolId: data.poolId ? new PublicKey(data.poolId) : null,
            mainKp: data.mainKp,
            poolKeys: data.poolKeys,
            removed: data.removed
        }

        if (!params.mainKp) return;
        const MINT_ADDRESS = params.mint;
        const mainPkStr = params.mainKp
        const mainKeypair = Keypair.fromSecretKey(bs58.decode(mainPkStr))
        const account = await getAssociatedTokenAddress(MINT_ADDRESS!, mainKeypair.publicKey);
        console.log("🚀 ~ MINT_ADDRESS:", MINT_ADDRESS)
        console.log("🚀 ~ mainKeypair.publicKey:", mainKeypair.publicKey.toBase58())
        console.log("🚀 ~ account:", account.toBase58())

        const authorityType = AuthorityType.MintTokens

        if (mainKeypair.publicKey) {
            const transaction = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 60_000,
                }),
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                }),
                createSetAuthorityInstruction(
                    MINT_ADDRESS!,
                    mainKeypair.publicKey,
                    authorityType,
                    null
                )
            )

            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.feePayer = mainKeypair.publicKey;
            console.log(await connection.simulateTransaction(transaction))

            try {
                const signature = await sendAndConfirmTransaction(connection, transaction, [mainKeypair])
                const Tx = signature ? `https://solscan.io/tx/${signature}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
                console.log("Revoke mint authority: ", Tx)
                await sleep(5000)
                securityCheckWaiting()
            } catch (err) {
                console.log("revoking error ====>", err);
                securityCheckWaiting()
            }
        }
    } catch (error) {
        console.log("Error happened in one of the token flow", error)
    }
}