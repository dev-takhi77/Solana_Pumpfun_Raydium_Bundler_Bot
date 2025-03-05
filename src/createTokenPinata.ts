import { Keypair, PublicKey, SystemProgram, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import {
    createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMintToInstruction,
    getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, MintLayout, TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { PROGRAM_ID, DataV2, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import axios from 'axios';
import FormData from 'form-data';
import base58 from 'bs58';
import fs from 'fs';
import { BN } from 'bn.js';
import { cluster, connection, pinataApiKey, pinataSecretApiKey } from '../config';
import { Metadata, UserToken } from "./types"
import { readJson } from './utils';
import { LP_wallet_keypair } from '../settings';

const uploadToIPFS = async (filePath: string) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();

    data.append('file', fs.createReadStream(filePath));

    const res = await axios.post(url, data, {
        maxContentLength: Infinity,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
            'pinata_api_key': pinataApiKey,
            'pinata_secret_api_key': pinataSecretApiKey
        }
    });

    return res.data.IpfsHash;
};

const uploadMetadata = async (metadata: object) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

    const res = await axios.post(url, metadata, {
        headers: {
            'pinata_api_key': pinataApiKey,
            'pinata_secret_api_key': pinataSecretApiKey
        }
    });

    return res.data.IpfsHash;
};

export const createTokenWithMetadata = async (token: UserToken) => {
    try {
        const { name, symbol, description, decimals, uiAmount, image } = token

        const payer = LP_wallet_keypair
        const walletPk = payer.publicKey

        const number = Date.now()
        // Upload image to IPFS
        const imageHash = await uploadToIPFS(image);
        console.log(Date.now() - number, "ms to upload to IPFS")
        console.log(`Image link: https://gateway.pinata.cloud/ipfs/${imageHash}`)

        // Prepare metadata
        const metadata: Metadata = {
            name,
            symbol,
            description,
            image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
        };

        if (token.extensions)
            metadata.extensions = token.extensions
        if(token.tags)
            metadata.tags = token.tags
        if(token.creator)
            metadata.creator = token.creator
        // Upload metadata to IPFS
        const metadataHash = await uploadMetadata(metadata);
        const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
        console.log(`Metadata uploaded: ${metadataUri}`);

        const mint_rent = await getMinimumBalanceForRentExemptMint(connection)
    
        const mintKp = Keypair.generate();
        
        const mint = mintKp.publicKey
        const tokenAta = await getAssociatedTokenAddress(mint, walletPk)
        const [metadataPDA] = await PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ], PROGRAM_ID
        );

        const amount = BigInt(new BN(uiAmount).mul(new BN(10 ** decimals)).toString())
        const tokenMetadata: DataV2 = {
            name: name,
            symbol: symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        };
        const transaction = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 60_000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            }),
            SystemProgram.createAccount({
                fromPubkey: walletPk,
                newAccountPubkey: mint,
                space: MintLayout.span,
                lamports: mint_rent,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(mint, decimals, walletPk, walletPk),
            createAssociatedTokenAccountInstruction(walletPk, tokenAta, walletPk, mint),
            createMintToInstruction(mint, tokenAta, walletPk, amount),
            // createUpdateMetadataAccountV2Instruction({
            //     metadata: metadataPDA,
            //     mint,
            //     mintAuthority: walletPk,
            //     payer: walletPk,
            //     updateAuthority: walletPk,
            // }, {
            //     updateMetadataAccountArgsV2: {
            //         data: tokenMetadata,
            //         isMutable: true,
            //         updateAuthority: walletPk,
            //         primarySaleHappened: true
            //     }
            // }
            // )
            createCreateMetadataAccountV3Instruction(
                {
                    metadata: metadataPDA,
                    mint: mint,
                    mintAuthority: walletPk,
                    payer: walletPk,
                    updateAuthority: walletPk,
                },
                {
                    createMetadataAccountArgsV3: {
                        data: tokenMetadata,
                        isMutable: false,
                        collectionDetails: null
                    }
                }
            )
        )
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        transaction.feePayer = walletPk
        // console.log(await connection.simulateTransaction(transaction))
        const sig = await sendAndConfirmTransaction(connection, transaction, [payer, mintKp], { skipPreflight: true, commitment: "finalized" })
        console.log(`Token is created: https://solscan.io/tx/${sig}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        console.log(`Token contract link: https://solscan.io/token/${mint}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        return { mint, amount }

    } catch (error) {
        console.log("Create token error: ", error)
        return
    }
};
