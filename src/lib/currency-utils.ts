/**
 * Formats a number to Indian currency format (Lakhs/Crores) manually to avoid hydration mismatches.
 * Standard toLocaleString('en-IN') can vary between server and client if locale data is missing.
 */
export function formatIndianCurrency(amount: number): string {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    
    const x = amount.toString();
    const lastThree = x.substring(x.length - 3);
    const otherNumbers = x.substring(0, x.length - 3);
    let result = lastThree;
    if (otherNumbers !== '') {
        result = ',' + lastThree;
    }
    const finalRes = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + result;
    return finalRes;
}
