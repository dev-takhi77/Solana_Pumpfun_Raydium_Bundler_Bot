import { PublicKey } from "@solana/web3.js"

import { tokens } from "../settings"
import { mainMenuWaiting, outputBalance, readJson, saveDataToFile, sleep } from "../src/utils"
import { getWalletTokenAccount } from "../src/get_balance";
import { LP_wallet_keypair } from "../settings";
import { ammRemoveLiquidity } from "../src/removeLiquidity";
import { init } from "..";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const execute = async () => {
  // remove liquidity
  console.log("\n***************************************************************\n")
  await sleep(5000)
  const data = readJson()
  let params = {
    mint: data.mint ? new PublicKey(data.mint) : null,
    marketId: data.marketId ? new PublicKey(data.marketId) : null,
    poolId: data.poolId ? new PublicKey(data.poolId) : null,
    mainKp: data.mainKp,
    poolKeys: data.poolKeys,
    removed: data.removed
  }
  let removeTried = 0
  while (true) {
    if (removeTried > 10) {
      console.log("Remove liquidity transaction called many times, pull tx failed")
      return
    }
    // const removed = await ammRemoveLiquidity(LP_wallet_keypair, params.poolId!, params.poolKeys)
    const removed = await ammRemoveLiquidity(LP_wallet_keypair, params.poolId!)
    if (removed) {
      params.removed = true
      saveDataToFile(params)
      console.log("Single token has been completed through process")
      await sleep(2000)
      await outputBalance(LP_wallet_keypair.publicKey)
      console.log("\n***************************************************************\n")
      return
    } else {
      console.log("Failed to remove liquidity")
      removeTried++
    }
  }
}

export const remove_liquidity = async () => {
  for (let i = 0; i < tokens.length; i++) {
    console.log(`Token ${i + 1} Liquidity Removed`)
    await execute()
    console.log("One token remove process is ended, and go for next one")
    await sleep(10000)
    mainMenuWaiting()
  }
}

// remove_liquidity()
