import readline from "readline"
import fs from 'fs'

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

export const screen_clear = () => {
    console.clear();
}

export const main_menu_display = () => {
    console.log('\t[1] - Create Token and Buy');
    console.log('\t[2] - Sell');
    console.log('\t[3] - Gather');
    console.log('\t[4] - Monitor');
    console.log('\t[5] - Transfer to External Wallet')
    console.log('\t[6] - Exit');
}

export const security_checks_display = () => {
    console.log('\t[1] - Remove Mint Authority');
    console.log('\t[2] - Remove Freeze Authority');
    console.log('\t[3] - Burn LP Token');
    console.log('\t[4] - Back');
    console.log('\t[5] - Exit');
}