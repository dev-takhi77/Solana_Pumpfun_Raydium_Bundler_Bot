import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Keypair,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  VersionedTransactionResponse,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { PriorityFee, TransactionResult } from "./types";
import fs from "fs"
import bs58 from "bs58";
import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { sha256 } from "js-sha256";
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "../constants";


const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})

export const DEFAULT_COMMITMENT: Commitment = "finalized";
export const DEFAULT_FINALITY: Finality = "finalized";

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / BigInt(1000);
};

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount - (amount * basisPoints) / BigInt(1000);
};

export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult> {

  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }
  newTx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);
  try {
    console.log((await connection.simulateTransaction(versionedTx, undefined)))

    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("Transaction signature: ", `https://solscan.io/tx/${sig}`);

    let txResult = await getTxDetails(connection, sig, commitment, finality);
    if (!txResult) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }
    return {
      success: true,
      signature: sig,
      results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e as SendTransactionError;
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

export async function buildTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransaction> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }
  newTx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);
  return versionedTx;
}

export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment))
    .blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};

export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; // The maximum is inclusive, the minimum is inclusive
}

export const readBuyerWallet = (fileName: string) => {
  const filePath = `.keys/${fileName}.txt`
  try {
    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Read the file content
      const publicKey = fs.readFileSync(filePath, 'utf-8');
      return publicKey.trim(); // Remove any surrounding whitespace or newlines
    } else {
      console.log(`File ${filePath} does not exist.`);
      return null; // Return null if the file does not exist
    }
  } catch (error) {
    console.log('Error reading public key from file:', error);
    return null; // Return null in case of error
  }
};

export const retrieveEnvVariable = (variableName: string) => {
  const variable = process.env[variableName] || ''
  if (!variable) {
    console.log(`${variableName} is not set`)
    process.exit(1)
  }
  return variable
}

export function getOrCreateKeypair(dir: string, keyName: string): Keypair {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const authorityKey = dir + "/" + keyName + ".json";
  if (fs.existsSync(authorityKey)) {
    const data: {
      secretKey: string;
      publicKey: string;
    } = JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
  } else {
    const keypair = Keypair.generate();
    keypair.secretKey;
    fs.writeFileSync(
      authorityKey,
      JSON.stringify({
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      })
    );
    return keypair;
  }
}

export const printSOLBalance = async (
  connection: Connection,
  pubKey: PublicKey,
  info: string = ""
) => {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    balance / LAMPORTS_PER_SOL,
    `SOL`
  );
};

export const getSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve: boolean = false
) => {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) { }
  return null;
};

export const printSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info: string = ""
) => {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

export const baseToValue = (base: number, decimals: number): number => {
  return base * Math.pow(10, decimals);
};

export const valueToBase = (value: number, decimals: number): number => {
  return value / Math.pow(10, decimals);
};

//i.e. account:BondingCurve
export function getDiscriminator(name: string) {
  return sha256.digest(name).slice(0, 8);
}

// Define the type for the JSON file content
export interface Data {
  privateKey: string;
  pubkey: string;
}

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const execute = async (transaction: VersionedTransaction, latestBlockhash: Blockhash, isBuy: boolean | 1 = true) => {

  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true })
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    }
  );

  if (confirmation.value.err) {
    console.log("Confirmation error")
    return ""
  } else {
    if (isBuy === 1) {
      return signature
    } else if (isBuy)
      console.log(`Success in buy transaction: https://solscan.io/tx/${signature}`)
    else
      console.log(`Success in Sell transaction: https://solscan.io/tx/${signature}`)
  }
  return signature
}

export const saveHolderWalletsToFile = (newData: Data[], filePath: string = ".keys/holderWallets.json") => {
  try {
    let existingData: Data[] = [];

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // If the file exists, read its content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    }

    // Add the new data to the existing array
    existingData.push(...newData);

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File ${filePath} deleted and create new file.`);
      }
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      console.log("File is saved successfully.")
    } catch (error) {
      console.log('Error saving data to JSON file:', error);
    }
  }
};

export async function newSendToken(
  walletKeypairs: Keypair[], tokensToSendArr: number[], walletKeypair: Keypair, mintAddress: PublicKey, tokenDecimal: number
) {
  try {
    const srcAta = await getAssociatedTokenAddress(mintAddress, walletKeypair.publicKey)
    if (tokensToSendArr.length !== walletKeypairs.length) {
      console.log("Number of wallets and token amounts array is not matching")
      throw new Error("Number of wallets and token amounts array is not matching")
    }

    console.log("Token amount of the srcAta: ", (await connection.getTokenAccountBalance(srcAta)).value.amount)

    const insts: TransactionInstruction[] = []
    console.log("Wallet length to distribute: ", walletKeypairs.length)
    for (let i = 0; i < walletKeypairs.length; i++) {
      const destKp = walletKeypairs[i]
      const amount = tokensToSendArr[i]
      console.log("token amount ", amount)

      const baseAta = await getAssociatedTokenAddress(mintAddress, destKp.publicKey)
      if (!await connection.getAccountInfo(baseAta)) {
        insts.push(
          createAssociatedTokenAccountInstruction(
            walletKeypair.publicKey,
            baseAta,
            destKp.publicKey,
            mintAddress
          )
        )
      }

      insts.push(
        createTransferCheckedInstruction(
          srcAta,
          mintAddress,
          baseAta,
          walletKeypair.publicKey,
          Math.floor(amount * 10 ** tokenDecimal),
          tokenDecimal
        )
      )
    }

    console.log("total number of instructions : ", insts.length)
    const txs = await makeTxs(insts, walletKeypair)
    if (!txs) {
      console.log("Transaction not retrieved from makeTxs function")
      throw new Error("Transaction not retrieved from makeTxs function")
    }
    try {
      await Promise.all(txs.map(async (transaction, i) => {
        await sleep(i * 200)
        // Assuming you have a function to send a transaction
        return handleTxs(transaction, walletKeypair)
      }));

    } catch (error) {
      console.log("Error in transaction confirmation part : ", error)
    }
  } catch (error) {
    console.log("New Send Token function error : ", error)
  }
}

const makeTxs = async (insts: TransactionInstruction[], mainKp: Keypair) => {
  try {

    const batchNum = 12
    const txNum = Math.ceil(insts.length / batchNum)
    const txs: Transaction[] = []
    for (let i = 0; i < txNum; i++) {
      const upperIndex = batchNum * (i + 1)
      const downIndex = batchNum * i
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
      )

      for (let j = downIndex; j < upperIndex; j++)
        if (insts[j])
          tx.add(insts[j])

      tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash
      tx.feePayer = mainKp.publicKey
      console.log(await connection.simulateTransaction(tx))

      txs.push(tx)
    }
    if (txs.length == 0) {
      console.log("Empty instructions as input")
      throw new Error("Empty instructions as input")
    }
    return txs
  } catch (error) {
    console.log("MakeTxs ~ error")
  }

}

const handleTxs = async (transaction: Transaction, mainKp: Keypair) => {
  const sig = await sendAndConfirmTransaction(connection, transaction, [mainKp], { skipPreflight: true })
  console.log(`https://solscan.io/tx/${sig}`);
}