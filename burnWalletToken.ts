import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { createBurnCheckedInstruction, getAssociatedTokenAddress, unpackMint } from "@solana/spl-token";

import { swapWallets, tokens } from "./config"
import { readJson, securityCheckWaiting, sleep } from "./src/utils"
import { PoolInfo, UserToken } from './src/types'
import { getTokenAccountBalance, getWalletTokenAccount } from "./src/get_balance";
import { connection } from "./config";

import bs58 from 'bs58'
import { security_checks } from ".";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const execute = async (token: UserToken) => {
  let params: PoolInfo
  try {
    const data = readJson()

    const MINT_ADDRESS = new PublicKey("71KDcWoRTLYzgJ1tFu9ePQgrkFDDv7YX7vuzmJPJUEmy");
    const WALLET = swapWallets[0]
    const MINT_DECIMALS = 9
    const account = await getAssociatedTokenAddress(MINT_ADDRESS, WALLET.publicKey);
    console.log("🚀 ~ execute ~ account:", account)
    const BURN_QUANTITY = await getTokenAccountBalance(
      connection,
      WALLET.publicKey.toString(),
      MINT_ADDRESS.toString()
    );
    console.log("🚀 ~ execute ~ BURN_QUANTITY:", BURN_QUANTITY)

    const burnIx = createBurnCheckedInstruction(
      account,
      MINT_ADDRESS!,
      WALLET.publicKey,
      BURN_QUANTITY!,
      MINT_DECIMALS!
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    const messageV0 = new TransactionMessage({
      payerKey: WALLET.publicKey,
      recentBlockhash: blockhash,
      instructions: [burnIx]
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([WALLET]);

    const txid = await connection.sendTransaction(transaction);

    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: lastValidBlockHeight
    });
    if (confirmation.value.err) { throw new Error("    ❌ - Transaction not confirmed.") }
    console.log('🔥 SUCCESSFUL BURN!🔥', '\n', `https://explorer.solana.com/tx/${txid}?cluster=devnet`);

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
  }
}

// burn_lp()
