import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { createBurnCheckedInstruction, getAssociatedTokenAddress, unpackMint } from "@solana/spl-token";

import { cluster } from "../config"
import { tokens } from "../settings"
import { burnLpQuantityPercent } from "../settings"
import { mainMenuWaiting, readJson, securityCheckWaiting, sleep } from "./utils"
import { PoolInfo, UserToken } from './types'
import { getWalletTokenAccount } from "./get_balance";
import { connection } from "../config";

import bs58 from 'bs58'

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const execute = async (token: UserToken) => {
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

    const MINT_ADDRESS = new PublicKey(params.poolKeys?.lpMint!);
    const MINT_DECIMALS = params.poolKeys?.baseDecimals;
    const BURN_QUANTITY_PERCENT = burnLpQuantityPercent;

    if (!params.mainKp) return;
    const mainPkStr = params.mainKp
    const mainKeypair = Keypair.fromSecretKey(bs58.decode(mainPkStr))
    const account = await getAssociatedTokenAddress(MINT_ADDRESS!, mainKeypair.publicKey);
    const lpBalance = parseInt((await connection.getTokenAccountBalance(account)).value.amount)
    
    console.log("🚀 ~ single ~ account:", account)

    const burnIx = createBurnCheckedInstruction(
      account,
      MINT_ADDRESS!,
      mainKeypair.publicKey,
      Math.floor(lpBalance * BURN_QUANTITY_PERCENT / 100),
      MINT_DECIMALS!
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    const messageV0 = new TransactionMessage({
      payerKey: mainKeypair.publicKey,
      recentBlockhash: blockhash,
      instructions: [burnIx]
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mainKeypair]);

    const txid = await connection.sendTransaction(transaction);

    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    });
    if (confirmation.value.err) { throw new Error("    ❌ - Transaction not confirmed.") }
    console.log('🔥 SUCCESSFUL BURN!🔥', '\n', `https://explorer.solana.com/tx/${txid}${cluster == "devnet" ? "?cluster=devnet" : ""}`);

  } catch (error) {
    console.log("Error happened in one of the token flow", error)
  }
}

export const burn_lp = async () => {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`Token ${i + 1} is to be burnt`)
    await execute(token)
    console.log("One token process is ended, and go for next one")
    await sleep(5000)
    mainMenuWaiting()
  }
}
