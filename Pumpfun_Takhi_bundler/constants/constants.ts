import { retrieveEnvVariable } from "../utils"
import { PublicKey } from "@solana/web3.js";

export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY')
export const MINT_WALLET_PRIVATE = retrieveEnvVariable('MINT_WALLET_PRIVATE')
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT')
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT')
export const TOKEN_NAME = retrieveEnvVariable('TOKEN_NAME')
export const TOKEN_SYMBOL = retrieveEnvVariable('TOKEN_SYMBOL')
export const DESCRIPTION = retrieveEnvVariable('DESCRIPTION')
export const TOKEN_SHOW_NAME = retrieveEnvVariable('TOKEN_SHOW_NAME')
export const TOKEN_CREATE_ON = retrieveEnvVariable('TOKEN_CREATE_ON')
export const TWITTER = retrieveEnvVariable('TWITTER')
export const TELEGRAM = retrieveEnvVariable('TELEGRAM')
export const WEBSITE = retrieveEnvVariable('WEBSITE')
export const FILE = retrieveEnvVariable('FILE')
export const EXTERNAL_WALLET = retrieveEnvVariable('EXTERNAL_WALLET')
export const REMAIN_WALLET_AMOUNT = Number(retrieveEnvVariable('REMAIN_AMOUNT'))
export const TOTAL_DISTRIBUTE_AMOUNT = Number(retrieveEnvVariable('TOTAL_DISTRIBUTE_AMOUNT'))
export const MIN_AMOUNT = Number(retrieveEnvVariable('MIN_AMOUNT'))
export const MAX_AMOUNT = Number(retrieveEnvVariable('MAX_AMOUNT'))
export const DISTRIBUTION_WALLETNUM = Number(retrieveEnvVariable('DISTRIBUTION_WALLETNUM'))
export const MINT_AMOUNT = Number(retrieveEnvVariable('MINT_AMOUNT'))
export const JITO_FEE = Number(retrieveEnvVariable('JITO_FEE'))
export const PRIORITY_FEE = Number(retrieveEnvVariable('PRIORITY_FEE'))
export const TRACK_OR_NOT = retrieveEnvVariable('TRACK_OR_NOT') === "true"

export const global_mint = new PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump")
export const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");



