
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// We'll use a dynamic import for Cashfree since it might be ESM
async function main() {
    const orderId = 'ORDER_1771484447438_7101';

    // We'll try to use the same logic as in the verify route
    // But we need the Cashfree keys. Let's try to get them from process.env
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = process.env.CASHFREE_ENV;

    console.log(`Syncing order: ${orderId}`);
    console.log(`Env: ${env}, AppId: ${appId ? 'PRESENT' : 'MISSING'}`);

    if (!appId || !secretKey) {
        console.error('Missing Cashfree credentials in environment!');
        // Try to load from .env manually just in case
        require('dotenv').config();
        if (!process.env.CASHFREE_APP_ID) return;
    }

    const { Cashfree, CFEnvironment } = require('cashfree-pg');
    const cashfreeInstance = new Cashfree(
        process.env.CASHFREE_ENV === 'PRODUCTION' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
        process.env.CASHFREE_APP_ID,
        process.env.CASHFREE_SECRET_KEY
    );

    try {
        console.log('Fetching order details from Cashfree...');
        const response = await cashfreeInstance.PGOrderFetchPayments(orderId);
        const payments = response.data;

        console.log(`Payments found in Cashfree: ${payments?.length || 0}`);

        const successPayment = payments?.find(p => p.payment_status === "SUCCESS");

        if (successPayment) {
            console.log('Success payment found! Updating DB...');

            const updatedPayment = await prisma.payment.update({
                where: { orderId },
                data: {
                    paymentStatus: "Success",
                    orderStatus: "PAID",
                    transactionId: successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : undefined,
                    paymentMethod: successPayment.payment_group,
                    bankReference: successPayment.bank_reference,
                    paidAt: successPayment.payment_completion_time ? new Date(successPayment.payment_completion_time) : new Date(),
                    gatewayResponse: successPayment
                }
            });

            if (updatedPayment.userId) {
                await prisma.user.update({
                    where: { userId: updatedPayment.userId },
                    data: {
                        status: 'Active',
                        paymentStatus: 'Success',
                        transactionId: successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : undefined,
                        paymentAmount: successPayment.payment_amount || undefined
                    }
                });
                console.log('User account activated successfully!');
            }
        } else {
            console.log('No successful payment found for this order ID in Cashfree.');
            if (payments && payments.length > 0) {
                console.log('Latest payment status:', payments[0].payment_status);
            }
        }
    } catch (error) {
        console.error('Error syncing:', error.message);
        if (error.response) {
            console.error('Cashfree Error Response:', error.response.data);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
