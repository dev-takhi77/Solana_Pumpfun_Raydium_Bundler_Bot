import { mainMenuWaiting, sleep } from "../src/utils"
import { getWalletTokenAccount } from "../src/get_balance";
import { txCreateNewPoolAndBundleBuy } from "../src/createPoolAndBundleBuy";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

const execute = async () => {
  try {
    txCreateNewPoolAndBundleBuy()
  } catch (error) {
    console.log("Error happened in one of the token flow", error)
  }
}

export const bundle_pool_buy = async () => {
    console.log("Creating Pool and Bundle Buy Process Started...")
    await execute()
    await sleep(45000)
    mainMenuWaiting()
}
