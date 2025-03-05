import base58 from "bs58"
import { historyLog, mainMenuWaiting, readJson, retrieveEnvVariable, sleep } from "./utils"
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { SPL_ACCOUNT_LAYOUT, TokenAccount } from "@raydium-io/raydium-sdk";
import { getSellTxWithJupiter } from "./utils/swapOnlyAmm";
import { execute } from "./executor/legacy";
import { EXTERNAL_WALLET, PRIORITY_FEE, REMAIN_WALLET_AMOUNT, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "./constants";
import { readFileSync } from "fs";

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
})

const rpcUrl = retrieveEnvVariable("RPC_ENDPOINT");
const mainKpStr = retrieveEnvVariable('PRIVATE_KEY');
const connection = new Connection(rpcUrl, { commitment: "processed" });
const mainKp = Keypair.fromSecretKey(base58.decode(mainKpStr))

const exec = async () => {
  const walletsData = readJson()
  const mintWalletKpStr = JSON.parse(readFileSync("keys/mintWallet.json", "utf-8"))
  const mintWalletKp = Keypair.fromSecretKey(base58.decode(mintWalletKpStr))
  const wallets = walletsData.map((kp) => Keypair.fromSecretKey(base58.decode(kp)))
  wallets.map(async (kp, i) => {
    try {
      await sleep(i * 50)
      const accountInfo = await connection.getAccountInfo(kp.publicKey)

      const tokenAccounts = await connection.getTokenAccountsByOwner(kp.publicKey, {
        programId: TOKEN_PROGRAM_ID,
      },
        "confirmed"
      )
      const ixs: TransactionInstruction[] = []
      const accounts: TokenAccount[] = [];

      if (tokenAccounts.value.length > 0)
        for (const { pubkey, account } of tokenAccounts.value) {
          accounts.push({
            pubkey,
            programId: account.owner,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
          });
        }

      for (let j = 0; j < accounts.length; j++) {
        const baseAta = await getAssociatedTokenAddress(accounts[j].accountInfo.mint, mainKp.publicKey)
        const tokenAccount = accounts[j].pubkey
        const tokenBalance = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value

        let i = 0
        while (true) {
          if (i > 10) {
            console.log("Sell error before gather")
            break
          }
          if (tokenBalance.uiAmount == 0) {
            break
          }
          try {
            const sellTx = await getSellTxWithJupiter(kp, accounts[j].accountInfo.mint, tokenBalance.amount)
            if (sellTx == null) {
              // console.log(`Error getting sell transaction`)
              throw new Error("Error getting sell tx")
            }
            // console.log(await solanaConnection.simulateTransaction(sellTx))
            const latestBlockhashForSell = await solanaConnection.getLatestBlockhash()
            const txSellSig = await execute(sellTx, latestBlockhashForSell, false)
            const tokenSellTx = txSellSig ? `https://solscan.io/tx/${txSellSig}` : ''
            console.log("Sold token, ", tokenSellTx)
            break
          } catch (error) {
            i++
          }
        }
        await sleep(1000)

        const tokenBalanceAfterSell = (await connection.getTokenAccountBalance(accounts[j].pubkey)).value
        console.log("Wallet address & balance : ", kp.publicKey.toBase58(), tokenBalanceAfterSell.amount)
        historyLog(`Wallet address & balance : ${kp.publicKey.toBase58()}, ${tokenBalanceAfterSell.amount}`)
        ixs.push(createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, baseAta, mainKp.publicKey, accounts[j].accountInfo.mint))
        if (tokenBalanceAfterSell.uiAmount && tokenBalanceAfterSell.uiAmount > 0)
          ixs.push(createTransferCheckedInstruction(tokenAccount, accounts[j].accountInfo.mint, baseAta, kp.publicKey, BigInt(tokenBalanceAfterSell.amount), tokenBalance.decimals))
        ixs.push(createCloseAccountInstruction(tokenAccount, mainKp.publicKey, kp.publicKey))
      }

      if (accountInfo) {
        const solBal = await connection.getBalance(kp.publicKey)
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: mainKp.publicKey,
            lamports: solBal
          })
        )
      }

      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.floor((PRIORITY_FEE * 10 ** 9) / 350_000 * 10 ** 6) }),
          ...ixs,
        )
        tx.feePayer = mainKp.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        // console.log(await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [mainKp, kp], { commitment: "confirmed" })
        console.log(`Closed and gathered SOL from bundler wallets ${i} : https://solscan.io/tx/${sig}`)
        historyLog(`Closed and gathered SOL from bundler wallets ${i} : https://solscan.io/tx/${sig}`)
        return
      }
    } catch (error) {
      console.log("transaction error while gathering", error)
      return
    }
  })

}

export const gather_wallet = async () => {
  await exec()
  await sleep(5000)
  console.log("Gathering sol from bundler wallet completed!")
  historyLog("Gathering sol from bundler wallet completed!")
  mainMenuWaiting()
}