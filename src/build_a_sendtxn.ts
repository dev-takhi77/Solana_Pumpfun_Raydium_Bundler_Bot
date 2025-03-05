import {
  buildSimpleTransaction,
  InnerSimpleV0Transaction,

} from '@raydium-io/raydium-sdk';
import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
  PublicKey
} from '@solana/web3.js';

import {
  addLookupTableInfo,
  cluster,
  connection,
  makeTxVersion,
} from '../config';

import { Liquidity } from '@raydium-io/raydium-sdk';

import { getComputeBudgetConfig, getComputeBudgetConfigHigh } from "./budget";
import { BN } from "bn.js";





export async function sendTx(
  connection: Connection,
  payer: Keypair | Signer,
  txs: (VersionedTransaction | Transaction)[],
  options?: SendOptions
): Promise<string[]> {
  const txids: string[] = [];
  for (const iTx of txs) {
    if (iTx instanceof VersionedTransaction) {
      iTx.sign([payer]);
      txids.push(await connection.sendTransaction(iTx, options));
    } else {
      txids.push(await connection.sendTransaction(iTx, [payer], options));
    }
  }
  return txids;
}



export async function buildAndSendTx(keypair: Keypair, innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
  const willSendTx = await buildSimpleTransaction({
    connection,
    makeTxVersion,
    payer: keypair.publicKey,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: addLookupTableInfo,
  })

  return await sendTx(connection, keypair, willSendTx, options)
}



export async function build_swap_instructions(
  connection: any, 
  poolKeys: any, 
  tokenAccountRawInfos_Swap: any, 
  keypair: any, 
  inputTokenAmount: any, 
  minAmountOut: any,
  lookupTableCache: any
) {

  const innerTransactions = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: tokenAccountRawInfos_Swap,
      owner: keypair.publicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "in",
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig: { microLamports: 500_000, units: 300_000 },
  })

  return innerTransactions;

}



export async function build_swap_sell_instructions(
  Liquidity1: any, 
  connection: any, 
  poolKeys: any, 
  tokenAccountRawInfos_Swap: any, 
  keypair: any, 
  inputTokenAmount: any, 
  minAmountOut: any
) {

  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: tokenAccountRawInfos_Swap,
      owner: keypair.publicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "out",
    makeTxVersion,
    computeBudgetConfig: await getComputeBudgetConfigHigh(),

  })

  return innerTransactions;

}


export async function build_create_pool_instructions(
  programId: any,
  market_id: any,
  keypair: any,
  tokenAccountRawInfos: any,
  baseMint: any,
  baseDecimals: any,
  quoteMint: any,
  quoteDecimals: any,
  delay_pool_open_time: any,
  base_amount_input: any,
  quote_amount: any,
  lookupTableCache: any
) {

  const { innerTransactions } =
    await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: programId.AmmV4,
      marketInfo: {
        programId: programId.OPENBOOK_MARKET,
        marketId: market_id,
      },
      associatedOnly: false,
      ownerInfo: {
        feePayer: keypair.publicKey,
        wallet: keypair.publicKey,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
      },
      baseMintInfo: {
        mint: baseMint,
        decimals: baseDecimals,
      },
      quoteMintInfo: {
        mint: quoteMint,
        decimals: quoteDecimals,
      },

      startTime: new BN(Math.floor(Date.now() / 1000) + delay_pool_open_time),
      baseAmount: new BN(base_amount_input.toString()),
      quoteAmount: new BN(quote_amount.toString()),

      computeBudgetConfig: { microLamports: 500_000, units: 300_000 },
      checkCreateATAOwner: true,
      makeTxVersion: makeTxVersion,
      lookupTableCache,
      feeDestinationId: new PublicKey(
        cluster == "devnet" ? "3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR" : "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5"
      ),
    })
  
  return innerTransactions;

}