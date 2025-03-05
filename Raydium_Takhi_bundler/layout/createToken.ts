import { Keypair } from "@solana/web3.js"
import base58 from "bs58"

import { LP_wallet_private_key, tokens } from "../settings"
import { createTokenWithMetadata } from "../src/createTokenPinata"
import { mainMenuWaiting, outputBalance, readJson, retrieveEnvVariable, saveDataToFile, sleep } from "../src/utils"
import { PoolInfo, UserToken } from '../src/types'
import {
  getWalletTokenAccount,
} from "../src/get_balance";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const data = readJson()

const execute = async (token: UserToken) => {
  let params: PoolInfo
  try {
      params = {
        mint: null,
        marketId: null,
        poolId: null,
        mainKp: LP_wallet_private_key,
        poolKeys: null,
        removed: false
      }

    const mainKp = Keypair.fromSecretKey(base58.decode(params.mainKp!))
    if (!mainKp) {
      console.log("Main keypair is not set in recovery mode")
      return
    }
    await outputBalance(mainKp.publicKey)

    // create token
    console.log("\n***************************************************************\n")
    let tokenCreationFailed = 0
    while (true) {
      if (params.mint) {
        console.log("Token already created before, ", params.mint.toBase58())
        break
      }
      if (tokenCreationFailed > 5) {
        console.log("Token creation is failed in repetition, Terminate the process")
        return
      }
      const mintResult = await createTokenWithMetadata(token)
      if (!mintResult) {
        console.log("Token creation error, trying again")
        tokenCreationFailed++
      } else {
        const { amount, mint } = mintResult
        params.mint = mint
        await outputBalance(mainKp.publicKey)
        await sleep(5000)
        saveDataToFile(params)
        break
      }
    }

  } catch (error) {
    console.log("Error happened in one of the token flow", error)
  }
}

export const create_token = async () => {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`Token is to be created`)
    await execute(token)
    await sleep(5000)
    console.log("One token creating process is ended, and go for next step")
    mainMenuWaiting()
  }
}
