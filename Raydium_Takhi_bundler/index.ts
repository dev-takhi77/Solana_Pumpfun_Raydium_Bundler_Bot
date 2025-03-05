import { sleep } from "./src/utils"
import {
  getWalletTokenAccount,
} from "./src/get_balance";

import { main_menu_display, rl, screen_clear, security_checks_display } from "./menu/menu";
import { create_token } from "./layout/createToken";
import { create_market } from "./layout/createMarket";
import { revokeMintAuthority } from "./src/revokeMintAuthority";
import { revokeFreezeAuthority } from "./src/revokeFreezeAuthority";
import { bundle_pool_buy } from "./layout/poolBuy";
import { burn_lp } from "./src/burnLp";
import { manual_all_sell } from "./layout/manualAllSell";
import { wallet_create } from "./layout/walletCreate";
import { create_extend_lut_ata } from "./layout/createLutAta";
import { simulate } from "./layout/simulation";
import { sol_gather } from "./layout/solGather";
// import { manualRebuy } from "./layout/rebuy";
// import { holderDistribute } from "./layout/holderDistribute";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>

export const init = () => {
  screen_clear();
  console.log("Raydium Token Launchpad");

  main_menu_display();

  rl.question("\t[Main] - Choice: ", (answer: string) => {
    let choice = parseInt(answer);
    switch (choice) {
      case 1:
        create_token();
        break;
      case 2:
        create_market();
        break;
      case 3:
        security_checks();
        break;
      case 4:
        wallet_create();
        break;
      case 5:
        create_extend_lut_ata();
        break;
      case 6:
        simulate();
        break;
      case 7:
        bundle_pool_buy();
        break;
      case 8:
        burn_lp();
        break;
      case 9:
        manual_all_sell();
        break;
      case 10:
        sol_gather();
        break;
      case 11:
        process.exit(1);
        break;
      default:
        console.log("\tInvalid choice!");
        sleep(1500);
        init();
        break;
    }
  })
}

export const security_checks = () => {
  screen_clear();
  console.log("Security Checks")
  security_checks_display();

  rl.question("\t[Security Checks] - Choice: ", (answer: string) => {
    let choice = parseInt(answer);
    switch (choice) {
      case 1:
        revokeMintAuthority();
        break;
      case 2:
        revokeFreezeAuthority();
        break;
      case 3:
        init();
        break;
      case 4:
        process.exit(1);
        break;
      default:
        console.log("\tInvalid choice!");
        sleep(1500);
        security_checks();
        break;
    }
  })
}

init()