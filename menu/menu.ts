import readline from "readline"

export const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

export const screen_clear = () => {
    console.clear();
}

export const main_menu_display = () => {
    console.log('\t[1] - Create Token');
    console.log('\t[2] - Create Market');
    console.log('\t[3] - Security Checks');
    console.log('\t[4] - Create Wallets to BundleBuy');
    console.log('\t[5] - Create LookUpTable');
    console.log('\t[6] - Extend LookUpTable and Simulate');
    console.log('\t[7] - Create Pool And BundleBuy');
    console.log('\t[8] - Burn LP Token');
    console.log('\t[9] - Sell all tokens');
    console.log('\t[10] - Gather Sol from bundler wallets');
    console.log('\t[11] - Exit');
}

export const security_checks_display = () => {
    console.log('\t[1] - Remove Mint Authority');
    console.log('\t[2] - Remove Freeze Authority');
    console.log('\t[3] - Back');
    console.log('\t[4] - Exit');
}