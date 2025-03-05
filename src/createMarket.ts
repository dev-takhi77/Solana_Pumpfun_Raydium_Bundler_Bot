import { MAINNET_PROGRAM_ID, DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk"
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"
import {
  getMint,
  TOKEN_PROGRAM_ID,
  ACCOUNT_SIZE,
  createInitializeAccountInstruction,
  NATIVE_MINT,
} from "@solana/spl-token"
import BN from "bn.js"
import { DexInstructions, Market } from "@project-serum/serum"
import {
  calculateTotalAccountSize,
  EVENT_QUEUE_HEADER_SIZE,
  EVENT_SIZE,
  REQUEST_QUEUE_HEADER_SIZE,
  REQUEST_SIZE,
  ORDERBOOK_HEADER_SIZE,
  ORDERBOOK_NODE_SIZE,
  sleep,
} from "../src/utils"
import { cluster, connection } from "../config"
import { executeLegacyTx } from "./execute"

const raydiumProgramId = cluster == "mainnet" ?
  MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID

const LOT_SIZE = -3
const TICK_SIZE = 8
const TOTAL_EVENT_QUEUE_SIZE = calculateTotalAccountSize(
  128,
  EVENT_QUEUE_HEADER_SIZE,
  EVENT_SIZE
)

const TOTAL_REQUEST_QUEUE_SIZE = calculateTotalAccountSize(
  10,
  REQUEST_QUEUE_HEADER_SIZE,
  REQUEST_SIZE
)

const TOTAL_ORDER_BOOK_SIZE = calculateTotalAccountSize(
  201,
  ORDERBOOK_HEADER_SIZE,
  ORDERBOOK_NODE_SIZE
)

const getVaultNonce = async (market: PublicKey, programId: PublicKey) => {
  let i = 0
  let result = null
  while (true) {
    result =
      await getVaultOwnerAndNonce(
        market,
        programId,
        i
      )
    if (result)
      return result
    else
      i++
  }
}


export async function getVaultOwnerAndNonce(
  marketAddress: PublicKey,
  dexAddress: PublicKey,
  seedNum: number
): Promise<[vaultOwner: PublicKey, nonce: BN] | undefined> {
  let nonce = new BN(seedNum)
  // console.log("nonce:", nonce)
  try {
    // console.log("market address: ", marketAddress.toBase58())
    // console.log("dex address: ", dexAddress.toBase58())

    const vaultOwner = PublicKey.createProgramAddressSync(
      [marketAddress.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
      dexAddress
    )
    // console.log("vault owner ", vaultOwner.toBase58())
    return [vaultOwner, nonce]
  } catch (e) {
    console.log('found incompatible bump here, trying again')
  }
}


export const createMarket = async (
  wallet: Keypair,
  baseMintAddress: PublicKey
) => {
  try {
    let baseMint: PublicKey
    let baseMintDecimals: number
    let quoteMint: PublicKey
    let quoteMintDecimals: number
    const vaultInstructions: TransactionInstruction[] = []
    const marketInstructions: TransactionInstruction[] = []

    try {
      const baseMintInfo = await getMint(connection, baseMintAddress)
      baseMint = baseMintInfo.address
      baseMintDecimals = baseMintInfo.decimals

      const quoteMintInfo = await getMint(connection, NATIVE_MINT)
      quoteMint = quoteMintInfo.address
      quoteMintDecimals = quoteMintInfo.decimals
    } catch (e) {
      console.error("Invalid mints provided.", e)
      return
    }

    const timeOut = setTimeout(async () => {
      console.log("Trying market creation again")
      const marketId = await createMarket(wallet, baseMintAddress)
      return marketId
    }, 20000)

    const marketAccounts = {
      market: Keypair.generate(),
      requestQueue: Keypair.generate(),
      eventQueue: Keypair.generate(),
      bids: Keypair.generate(),
      asks: Keypair.generate(),
      baseVault: Keypair.generate(),
      quoteVault: Keypair.generate(),
    }
    const [vaultOwner, vaultOwnerNonce] = await getVaultNonce(
      marketAccounts.market.publicKey,
      raydiumProgramId.OPENBOOK_MARKET
    )

    // create vaults


    vaultInstructions.push(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: marketAccounts.baseVault.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          ACCOUNT_SIZE
        ),
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: marketAccounts.quoteVault.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          ACCOUNT_SIZE
        ),
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(
        marketAccounts.baseVault.publicKey,
        baseMint,
        vaultOwner
      ),
      createInitializeAccountInstruction(
        marketAccounts.quoteVault.publicKey,
        quoteMint,
        vaultOwner
      )
    )

    clearTimeout(timeOut)
    // tickSize and lotSize here are the 1e^(-x) values, so no check for ><= 0
    const baseLotSize = Math.round(
      10 ** baseMintDecimals * Math.pow(10, -1 * LOT_SIZE)
    )
    const quoteLotSize = Math.round(
      10 ** quoteMintDecimals *
      Math.pow(10, -1 * LOT_SIZE) *
      Math.pow(10, -1 * TICK_SIZE)
    )
    // create market account
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.market.publicKey,
        fromPubkey: wallet.publicKey,
        space: Market.getLayout(raydiumProgramId.OPENBOOK_MARKET).span,
        lamports: await connection.getMinimumBalanceForRentExemption(
          Market.getLayout(raydiumProgramId.OPENBOOK_MARKET).span
        ),
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )

    // create request queue
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.requestQueue.publicKey,
        fromPubkey: wallet.publicKey,
        space: TOTAL_REQUEST_QUEUE_SIZE,
        lamports: await connection.getMinimumBalanceForRentExemption(
          TOTAL_REQUEST_QUEUE_SIZE
        ),
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )

    // create event queue
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.eventQueue.publicKey,
        fromPubkey: wallet.publicKey,
        space: TOTAL_EVENT_QUEUE_SIZE,
        lamports: await connection.getMinimumBalanceForRentExemption(
          TOTAL_EVENT_QUEUE_SIZE
        ),
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )

    const orderBookRentExempt =
      await connection.getMinimumBalanceForRentExemption(TOTAL_ORDER_BOOK_SIZE)

    // create bids
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.bids.publicKey,
        fromPubkey: wallet.publicKey,
        space: TOTAL_ORDER_BOOK_SIZE,
        lamports: orderBookRentExempt,
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )

    // create asks
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.asks.publicKey,
        fromPubkey: wallet.publicKey,
        space: TOTAL_ORDER_BOOK_SIZE,
        lamports: orderBookRentExempt,
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )

    marketInstructions.push(
      DexInstructions.initializeMarket({
        market: marketAccounts.market.publicKey,
        requestQueue: marketAccounts.requestQueue.publicKey,
        eventQueue: marketAccounts.eventQueue.publicKey,
        bids: marketAccounts.bids.publicKey,
        asks: marketAccounts.asks.publicKey,
        baseVault: marketAccounts.baseVault.publicKey,
        quoteVault: marketAccounts.quoteVault.publicKey,
        baseMint,
        quoteMint,
        baseLotSize: new BN(baseLotSize),
        quoteLotSize: new BN(quoteLotSize),
        feeRateBps: 150, // Unused in v3
        quoteDustThreshold: new BN(500), // Unused in v3
        vaultSignerNonce: vaultOwnerNonce,
        programId: raydiumProgramId.OPENBOOK_MARKET,
      })
    )
    console.log("Transactions for market creation is ready, sending transactions")
    try {
      let blockhash = (await connection.getLatestBlockhash("confirmed"));

      const createVaultTransaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 60_000,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        }),
        ...vaultInstructions
      );
      createVaultTransaction.recentBlockhash = blockhash.blockhash;
      createVaultTransaction.feePayer = wallet.publicKey;
      createVaultTransaction.sign(
        wallet,
        marketAccounts.baseVault,
        marketAccounts.quoteVault
      );

      console.log("VaultTransaction simulation: ", await connection.simulateTransaction(createVaultTransaction))

      const createMarketTransaction = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 60_000,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        }),
        ...marketInstructions
      );
      createMarketTransaction.recentBlockhash = blockhash.blockhash;
      createMarketTransaction.feePayer = wallet.publicKey;
      createMarketTransaction.sign(
        wallet,
        marketAccounts.market,
        marketAccounts.requestQueue,
        marketAccounts.eventQueue,
        marketAccounts.bids,
        marketAccounts.asks
      );

      console.log("MarketTransaction simulation: ", await connection.simulateTransaction(createMarketTransaction))

      let index1 = 0
      while (true) {
        if (index1 > 10) {
          console.log("Error in creating market")
          return
        } else {
          const sig1 = await executeLegacyTx(
            createVaultTransaction,
            [
              wallet,
              marketAccounts.baseVault,
              marketAccounts.quoteVault
            ],
            blockhash
          )
          if (!sig1)
            console.log("Retrying create vault transaction")
          else {
            console.log(`Vault signature: https://solscan.io/tx/${sig1}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
            break
          }
        }
      }
      let index2 = 0
      while (true) {
        if (index2 > 10) {
          console.log("Error in creating market")
          return
        } else {
          const sig2 = await executeLegacyTx(
            createMarketTransaction,
            [
              wallet,
              marketAccounts.market,
              marketAccounts.requestQueue,
              marketAccounts.eventQueue,
              marketAccounts.bids,
              marketAccounts.asks
            ],
            blockhash
          )
          if (!sig2)
            console.log("Retrying create market transaction")
          else {
            console.log(`Market signature: https://solscan.io/tx/${sig2}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
            break
          }
        }
      }
      console.log("Market ID: ", `https://solscan.io/account/${marketAccounts.market.publicKey.toBase58()}${cluster == "devnet" ? "?cluster=devnet" : ""}`);
      return marketAccounts.market.publicKey;
    } catch (error) {
      console.error("Error creating market: ", error);
      return
    }
  } catch (error) {
    console.error("Error creating market: ", error);
    return
  }
}
