import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { EXTERNAL_WALLET, PRIVATE_KEY, REMAIN_WALLET_AMOUNT, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "./constants";
import base58 from "bs58"
import { historyLog, mainMenuWaiting, sleep } from "./utils";


const commitment = "confirmed"
const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})

const exec = async () => {

    const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))

    const externalWallet = new PublicKey(EXTERNAL_WALLET);
    const mainWalletAmount = await connection.getBalance(mainKp.publicKey)
    console.log(`Main Wallet  ${mainKp.publicKey} has ${mainWalletAmount / 10 ** 9} sol`)
    historyLog(`Main Wallet  ${mainKp.publicKey} has ${mainWalletAmount / 10 ** 9} sol`)
    console.log(`External Wallet: ${externalWallet} RemainAmount ${REMAIN_WALLET_AMOUNT}`)
    historyLog(`External Wallet: ${externalWallet} RemainAmount ${REMAIN_WALLET_AMOUNT}`)

    if (REMAIN_WALLET_AMOUNT * 10 ** 9 > mainWalletAmount) {
        console.log("Main Wallet has not enough sol")
        historyLog("Main Wallet has not enough sol")
        return
    }
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: mainKp.publicKey,
            toPubkey: externalWallet,
            lamports: Math.floor(mainWalletAmount - REMAIN_WALLET_AMOUNT * 10 ** 9)
        })
    )

    try {
        const signature = await sendAndConfirmTransaction(connection, tx, [mainKp]);
        console.log(`${mainWalletAmount / 10 ** 9 - REMAIN_WALLET_AMOUNT} sol transfering to ExternalWallet from MainWallet is successful.`);
        historyLog(`${mainWalletAmount / 10 ** 9 - REMAIN_WALLET_AMOUNT} sol transfering to ExternalWallet from MainWallet is successful.`)
    } catch (error) {
    }
}

export const toExternal = async () => {
    await exec()
    await sleep(5000)
    mainMenuWaiting()
}

