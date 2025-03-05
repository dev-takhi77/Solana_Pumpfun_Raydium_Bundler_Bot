import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "./src/pumpfun";
import { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "./constants";
import { readJson } from "./utils";
import base58 from "bs58";
import { rl } from "./menu/menu";

const commitment = "confirmed"

const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})

export const monitoring = async () => {
    const mintKpStr = readJson("mint.json").at(0)
    if (!mintKpStr) {
        return;
    }
    const mintkP = Keypair.fromSecretKey(base58.decode(mintKpStr))
    const mintAddress = mintkP.publicKey

    let sdk = new PumpFunSDK(new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment }));

    const Interval = setInterval(async () => {
        const tokenPrice = await sdk.getTokenPrice(mintAddress)
        console.log(`Now ${mintAddress.toString()} 's price is ${tokenPrice} sol`);
    }, 400)

}