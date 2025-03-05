import * as spl from '@solana/spl-token';
import { MARKET_STATE_LAYOUT_V3, Market } from '@openbook-dex/openbook';
import { AccountInfo, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { u8, u32, struct } from '@solana/buffer-layout';
import { u64, publicKey } from '@solana/buffer-layout-utils';
import base58 from 'bs58';
import { LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeysV4 } from '@raydium-io/raydium-sdk';
import { connection, cluster } from '../config';
import { LP_wallet_keypair } from '../settings';

export const SPL_MINT_LAYOUT = struct<any>([
  u32('mintAuthorityOption'),
  publicKey('mintAuthority'),
  u64('supply'),
  u8('decimals'),
  u8('isInitialized'),
  u32('freezeAuthorityOption'),
  publicKey('freezeAuthority')
]);

export const SPL_ACCOUNT_LAYOUT = struct<any>([
  publicKey('mint'),
  publicKey('owner'),
  u64('amount'),
  u32('delegateOption'),
  publicKey('delegate'),
  u8('state'),
  u32('isNativeOption'),
  u64('isNative'),
  u64('delegatedAmount'),
  u32('closeAuthorityOption'),
  publicKey('closeAuthority')
]);



export const rayFee = cluster == "devnet"? new PublicKey("3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR") : new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5");
// export const tipAcct = cluster == "devnet"? new PublicKey("3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR") :new PublicKey("Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY");
export const RayLiqPoolv4 = cluster == "devnet"? new PublicKey("HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8") : new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

export const wallet = LP_wallet_keypair

const openbookProgram =  cluster == "devnet"? new PublicKey("EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj") : new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX');

async function getMarketInfo(marketId: PublicKey) {
  let reqs = 0;
  let marketInfo = await connection.getAccountInfo(marketId);
  reqs++;

  while (!marketInfo) {
    marketInfo = await connection.getAccountInfo(marketId);
    reqs++;
    if (marketInfo) {
      break;
    } else if (reqs > 20) {
      console.log(`Could not get market info..`);

      return null;
    }
  }

  return marketInfo;
}

export async function fetchMarketId(connection: Connection, baseMint: PublicKey, quoteMint: PublicKey) {
  const accounts = await connection.getProgramAccounts(
    cluster == "devnet"? new PublicKey("EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj") : new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
      {
          commitment: "confirmed",
          filters: [
              { dataSize: MARKET_STATE_LAYOUT_V3.span },
              {
                  memcmp: {
                      offset: MARKET_STATE_LAYOUT_V3.offsetOf("baseMint"),
                      bytes: baseMint.toBase58(),
                  },
              },
              {
                  memcmp: {
                      offset: MARKET_STATE_LAYOUT_V3.offsetOf("quoteMint"),
                      bytes: quoteMint.toBase58(),
                  },
              },
          ],
      }
  );
  return accounts.map(({ account }) => MARKET_STATE_LAYOUT_V3.decode(account.data))[0].ownAddress
}



async function getDecodedData(marketInfo: {
  executable?: boolean;
  owner?: PublicKey;
  lamports?: number;
  data: any;
  rentEpoch?: number | undefined;
}) {
  return Market.getLayout(openbookProgram).decode(marketInfo.data);
}

async function getMintData(mint: PublicKey) {
  return connection.getAccountInfo(mint);
}

async function getDecimals(mintData: AccountInfo<Buffer> | null) {
  if (!mintData) throw new Error('No mint data!');

  return SPL_MINT_LAYOUT.decode(mintData.data).decimals;
}

async function getOwnerAta(mint: { toBuffer: () => Uint8Array | Buffer }, publicKey: PublicKey) {
  const foundAta = PublicKey.findProgramAddressSync(
    [publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];

  return foundAta;
}

function getVaultSigner(marketId: { toBuffer: any }, marketDeco: { vaultSignerNonce: { toString: () => any } }) {
  const seeds = [marketId.toBuffer()];
  const seedsWithNonce = seeds.concat(Buffer.from([Number(marketDeco.vaultSignerNonce.toString())]), Buffer.alloc(7));

  return PublicKey.createProgramAddressSync(seedsWithNonce, openbookProgram);
}

export async function derivePoolKeys(poolId: PublicKey): Promise<LiquidityPoolKeysV4 | null> {
  const account = await connection.getAccountInfo(poolId)
  if(!account) {
    console.log("Invalid account info")
    return null
  }
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)


  const marketInfo = await getMarketInfo(info.marketId);
  if (!marketInfo) return null;
  const marketId = info.marketId
  const marketDeco = await getDecodedData(marketInfo);
  const { baseMint } = marketDeco;
  const baseMintData = await getMintData(baseMint);
  const baseDecimals = await getDecimals(baseMintData);
  const ownerBaseAta = await getOwnerAta(baseMint, wallet.publicKey);
  const { quoteMint } = marketDeco;
  const quoteMintData = await getMintData(quoteMint);
  const quoteDecimals = await getDecimals(quoteMintData);
  const ownerQuoteAta = await getOwnerAta(quoteMint, wallet.publicKey);
  const authority = PublicKey.findProgramAddressSync(
    [Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])],
    RayLiqPoolv4
  )[0];
  const version: 4|5 = 4
  const marketVersion: 3 = 3
  const marketAuthority = getVaultSigner(marketId, marketDeco);

  // get/derive all the pool keys
  const poolKeys = {
    keg: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    version,
    marketVersion,
    programId: RayLiqPoolv4,
    baseMint,
    quoteMint,
    ownerBaseAta,
    ownerQuoteAta,
    baseDecimals,
    quoteDecimals,
    lpDecimals: baseDecimals,
    authority,
    marketAuthority,
    marketProgramId: openbookProgram,
    marketId,
    marketBids: marketDeco.bids,
    marketAsks: marketDeco.asks,
    marketQuoteVault: marketDeco.quoteVault,
    marketBaseVault: marketDeco.baseVault,
    marketEventQueue: marketDeco.eventQueue,
    id: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    baseVault: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    coinVault: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    lpMint: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    lpVault: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('temp_lp_token_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    targetOrders: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    withdrawQueue: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('withdraw_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    openOrders: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    quoteVault: PublicKey.findProgramAddressSync(
      [RayLiqPoolv4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')],
      RayLiqPoolv4
    )[0],
    lookupTableAccount: new PublicKey('11111111111111111111111111111111')
  };

  return poolKeys;
}