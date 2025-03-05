import { VersionedTransaction, Keypair, SystemProgram, Transaction, Connection, ComputeBudgetProgram, TransactionInstruction, TransactionMessage, AddressLookupTableProgram, PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import { openAsBlob, readFileSync, writeFileSync } from "fs";
import base58 from "bs58"

import { DESCRIPTION, DISTRIBUTION_WALLETNUM, FILE, global_mint, JITO_FEE, MAX_AMOUNT, MIN_AMOUNT, MINT_AMOUNT, MINT_WALLET_PRIVATE, PRIORITY_FEE, PRIVATE_KEY, PUMP_PROGRAM, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, TELEGRAM, TOKEN_CREATE_ON, TOKEN_NAME, TOKEN_SHOW_NAME, TOKEN_SYMBOL, TOTAL_DISTRIBUTE_AMOUNT, TWITTER, WEBSITE } from "./constants"
import { generateDistribution, historyLog, mainMenuWaiting, randVal, saveDataToFile, sleep } from "./utils"
import { createAndSendV0Tx, execute } from "./executor/legacy"
import { BONDING_CURVE_SEED, PumpFunSDK } from "./src/pumpfun";
import { executeJitoTx } from "./executor/jito";
import { readFile } from "fs/promises";
import { rl } from "./menu/menu";
import { solanaConnection } from "./gather";
import { connect } from "http2";

const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})
const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))

let kps: Keypair[] = []
const transactions: VersionedTransaction[] = []
const mintKp = Keypair.generate()
const mintWalletKp = Keypair.fromSecretKey(base58.decode(MINT_WALLET_PRIVATE))
const mintAddress = mintKp.publicKey



let sdk = new PumpFunSDK(new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment }));

const exec = async () => {
    console.log(Math.floor((PRIORITY_FEE * 10 ** 9) / 1_000_000 * 10 ** 6));


    console.log(await connection.getBalance(mainKp.publicKey) / 10 ** 9, "SOL in main Wallet")
    historyLog(`${await connection.getBalance(mainKp.publicKey) / 10 ** 9} Sol in Main Wallet`)

    writeFileSync("keys/mint.json", "")
    saveDataToFile([base58.encode(mintKp.secretKey)], "mint.json")


    console.log("\nDistributing SOL to wallets...")
    historyLog("Distributing SOL to wallets...")
    console.log(`Mint wallet address: ${mintWalletKp.publicKey.toString()}`)
    historyLog(`Mint wallet address: ${mintWalletKp.publicKey.toString()} \n`)
    const resDistribute = await distributeSol(connection, mainKp, DISTRIBUTION_WALLETNUM)
    if (resDistribute == null) {
        console.log("failed to distribute to fund wallets")
        historyLog("failed to distribute to fund wallets")
        return
    }
    console.log("\nCreating LUT started")
    historyLog("\nCreating LUT started")

    const lutAddress = await createLUT()
    // const lutAddress = new PublicKey("FQvvcPAXo3cQY1HP46kEEiUAHesMQLC6ZN9dPDsV55sc");
    if (!lutAddress) {
        console.log("Lut creation failed")
        historyLog("Lut createion failed")
        return
    }
    writeFileSync("keys/lut.json", JSON.stringify(lutAddress))
    console.log("LUT Address:", lutAddress.toBase58())
    historyLog(`LUT Address: ${lutAddress.toBase58()} \n`)
    await addAddressesToTable(lutAddress, mintAddress, kps)

    const buyIxs: TransactionInstruction[] = []

    for (let i = 0; i < DISTRIBUTION_WALLETNUM; i++) {
        const amount = await connection.getBalance(kps[i].publicKey)
        const ix = await makeBuyIx(kps[i], Math.floor((amount - 3000000) * 0.99), i)
        buyIxs.push(...ix)
    }

    const lookupTable = (await connection.getAddressLookupTable(lutAddress)).value;
    if (!lookupTable) {
        console.log("Lookup table not ready")
        return
    }
    const latestBlockhash = await connection.getLatestBlockhash()
    const tokenCreationIxs = await createTokenTx()
    
    // Token creation part is missing

    tokenCreationTx.sign([mintWalletKp, mintKp])

    transactions.push(tokenCreationTx)
    for (let i = 0; i < Math.ceil(DISTRIBUTION_WALLETNUM / 5); i++) {
        const latestBlockhash = await connection.getLatestBlockhash()
        const instructions: TransactionInstruction[] = []

        // Buy transaction part is missing
        
    }

    transactions.map(async (tx, i) => console.log(i, " | ", tx.serialize().length, "bytes | \n", (await connection.simulateTransaction(tx, { sigVerify: true }))))

    const res = await executeJitoTx(transactions, mainKp, commitment)

    await sleep(5000)
    if (res) {
        const result = await solanaConnection.getAccountInfo(mintAddress);
        console.log(`New Mint Address: https://solscan.io/account/${mintAddress.toString()}`)
        console.log(`jito signature: https://explorer.jito.wtf/bundle/${res}`)
        historyLog(`New Mint Address: https://solscan.io/account/${mintAddress.toString()}`)
        historyLog(`Create token and Buy jito signature: https://explorer.jito.wtf/bundle/${res}`)
    }

}

const distributeSol = async (connection: Connection, mainKp: Keypair, distritbutionNum: number) => {
    try {
        const sendSolTx: TransactionInstruction[] = []
        sendSolTx.push(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.floor((PRIORITY_FEE * 10 ** 9) / 1_000_000 * 10 ** 6) })
        )
        const mainSolBal = await connection.getBalance(mainKp.publicKey)

        if (mainSolBal <= (TOTAL_DISTRIBUTE_AMOUNT + JITO_FEE * 2 + 0.003) * 10 ** 9) {
            console.log("Main wallet balance is not enough")
            historyLog("Main wallet balance is not enough")
            return null
        }
        const mintWalletSolBal = await connection.getBalance(mintWalletKp.publicKey)
        if (mintWalletSolBal <= 0.0023) {
            console.log("Mint Wallet balance is not enough")
            historyLog("Mint Wallet balance is not enough")
            return null
        }
        const amountArray = generateDistribution(TOTAL_DISTRIBUTE_AMOUNT * 1000, MIN_AMOUNT * 1000, MAX_AMOUNT * 1000, DISTRIBUTION_WALLETNUM, "odd")
        if (!amountArray) {
            return null
        }

        for (let i = 0; i < distritbutionNum; i++) {
            const solAmount = Math.floor(amountArray[i] / 1000 * 10 ** 9)

            const wallet = Keypair.generate()
            kps.push(wallet)

            sendSolTx.push(
                SystemProgram.transfer({
                    fromPubkey: mainKp.publicKey,
                    toPubkey: wallet.publicKey,
                    lamports: solAmount
                })
            )
            console.log(wallet.publicKey.toString(), "has", (amountArray[i] / 1000).toString(), "sol")
            historyLog(`${wallet.publicKey.toString()} has ${(amountArray[i] / 1000).toString()} sol`)
        }

        try {
            writeFileSync("keys/data.json", JSON.stringify(""))
            saveDataToFile(kps.map(kp => base58.encode(kp.secretKey)))
        }
        catch (error) {

        }

        let index = 0
        while (true) {
            try {
                if (index > 5) {
                    console.log("Error in distribution")
                    return null
                }
                const siTx = new Transaction().add(...sendSolTx)
                const latestBlockhash = await connection.getLatestBlockhash()
                siTx.feePayer = mainKp.publicKey
                siTx.recentBlockhash = latestBlockhash.blockhash
                const messageV0 = new TransactionMessage({
                    payerKey: mainKp.publicKey,
                    recentBlockhash: latestBlockhash.blockhash,
                    instructions: sendSolTx,
                }).compileToV0Message()
                const transaction = new VersionedTransaction(messageV0)
                transaction.sign([mainKp])
                let txSig = await execute(transaction, latestBlockhash, 1)

                if (txSig) {
                    const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}` : ''
                    console.log("SOL for Fund wallet is distributed ", distibuteTx)
                    break
                }
                index++
            } catch (error) {
                index++
            }
        }

        console.log("Success in distribution")
        historyLog("Success in distribution")
        return kps
    } catch (error) {
        console.log(`Failed to transfer SOL`, error)
        return null
    }
}

// create token instructions

// make buy instructions

const createLUT = async () => {
    let i = 0
    while (true) {
        if (i > 5) {
            console.log("LUT creation failed, Exiting...")
            historyLog("LUT creation failed, Exiting...")
            return
        }
        try {
            const [lookupTableInst, lookupTableAddress] =
                AddressLookupTableProgram.createLookupTable({
                    authority: mainKp.publicKey,
                    payer: mainKp.publicKey,
                    recentSlot: await connection.getSlot(),
                });

            // Step 3 - Generate a create transaction and send it to the network
            const result = await createAndSendV0Tx([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 60_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.floor((PRIORITY_FEE * 10 ** 9) / 60_000 * 10 ** 6) }),
                lookupTableInst
            ], mainKp, connection);

            if (!result)
                throw new Error("Lut creation error")

            console.log("Lookup Table Address created successfully!")
            historyLog("Lookup Table Address created successfully!")
            await sleep(10000)

            return lookupTableAddress
        } catch (err) {
            console.log("Error in creating Lookuptable. Retrying.")
            historyLog("Error in creating Lookuptable. Retrying.")
            i++
        }
    }
}

// extending lookupTable part is missing

export const create_Buy = async () => {
    rl.question("\t Do you really want to create new pumpfun token and buy? [y/n]: ", async (answer: string) => {
        let choice = answer;
        console.log(choice)
        switch (choice) {
            case 'y':
                await exec()
                await sleep(5000)
                console.log("One token creating and buying process is ended, and go for next step!")
                break
            case 'n':
                break
            default:
                break
        }
        mainMenuWaiting()
    })
}



