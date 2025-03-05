import { Keypair, PublicKey } from "@solana/web3.js"
import base58 from "bs58"

import { tokens } from "../settings"
import { createMarket } from "../src/createMarket"
import { mainMenuWaiting, outputBalance, readJson, retrieveEnvVariable, saveDataToFile, sleep } from "../src/utils"
import { PoolInfo, UserToken } from '../src/types'
import {
  getWalletTokenAccount,
} from "../src/get_balance";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const execute = async (token: UserToken) => {
  let params: PoolInfo
  try {
    const data = readJson()
    if (!data.mainKp) {
      console.log("Main keypair is not set")
      return
    }
    params = {
      mint: data.mint ? new PublicKey(data.mint) : null,
      marketId: data.marketId ? new PublicKey(data.marketId) : null,
      poolId: data.poolId ? new PublicKey(data.poolId) : null,
      mainKp: data.mainKp,
      poolKeys: null,
      removed: data.removed
    }

    const mainKp = Keypair.fromSecretKey(base58.decode(params.mainKp!))
    if (!mainKp) {
      console.log("Main keypair is not set in recovery mode")
      return
    }
    await outputBalance(mainKp.publicKey)

    // create market
    console.log("\n***************************************************************\n")
    let marketCreationFailed = 0
    while (true) {
      if (params.marketId) {
        console.log("Market id already created before, ", params.marketId.toBase58())
        break
      }
      if (marketCreationFailed > 5) {
        console.log("Market creation is failed in repetition, Terminate the process")
        return
      }
      const marketId = await createMarket(mainKp, params.mint!)
      if (!marketId) {
        console.log("Market creation error")
        marketCreationFailed++
      } else {
        params.marketId = marketId
        await outputBalance(mainKp.publicKey)
        saveDataToFile(params)
        break
      }
    }
    await sleep(3000)
  } catch (error) {
    console.log("Error happened in one of the token flow", error)
    await sleep(3000)
  }
}

export const create_market = async () => {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`Market ${i + 1} is to be created`)
    await execute(token)
    console.log("One Market process is ended, and go for next one")
    mainMenuWaiting()
  }
}
