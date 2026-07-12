import { prisma } from "../../lib/prisma";
import { PropertyStatus, RequestStatus } from "../../../generated/prisma/enums";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import { handleCheckoutCompleted, handleInvoicePaymentFailed, handleInvoicePaymentSucceeded, handleSubscriptionDeleted, handleSubscriptionUpdated } from "../../utils/payment.utils";

const createSession = async (userId: string, rentalRequestId: string) => {
    const transactionResult = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
            where: { id: userId }
        });

        const rentalRequest = await tx.rentalRequest.findUniqueOrThrow({
            where: { id: rentalRequestId },
            include: { property: true }
        });

        if (rentalRequest.status === RequestStatus.PENDING)
            throw new Error("Your request is still pending. Please wait for the landlord to accept it.");

        if (rentalRequest.status === RequestStatus.REJECTED)
            throw new Error("Sorry! Your request has been rejected. You may request other rentals.");

        if (rentalRequest.tenantId !== userId)
            throw new Error("You are not accepted as paying tenant. Only the accepted tenant may pay to rent.");

        if (rentalRequest.property.status === PropertyStatus.RENTED)
            throw new Error("This property is already rented.");

        const previousPayment = await tx.payment.findFirst({
            where: { userId },
            orderBy: { updatedAt: "desc" }
        });

        let stripeCustomerId: string;
        if (previousPayment)
            stripeCustomerId = previousPayment.stripeCustomerId;
        else {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId }
            });
            stripeCustomerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price: rentalRequest.property.stripePriceId,
                quantity: 1
            }],
            mode: "subscription",
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            success_url: `${config.app_url}/payment?success=true`,
            cancel_url: `${config.app_url}/payment?success=false`,
            metadata: {
                userId,
                rentalRequestId,
                propertyId: rentalRequest.propertyId
            }
        });

        return session.url;
    });

    return { paymentUrl: transactionResult };
}

const confirmPayment = async (payload: Buffer, signature: string) => {
    // console.log("----------Webhook reached----------")
    const endpointSecret = config.stripe_webhook_secret;
    const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
    );
    // console.log(event.type);
    // console.log(event.data.object);

    switch (event.type) {
        // First successful checkout
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;

        // Every successful monthly renewal
        case "invoice.payment_succeeded":
            await handleInvoicePaymentSucceeded(event.data.object);
            break;

        // Renewal payment failed
        case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event.data.object);
            break;

        // Subscription updated
        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;

        // Subscription deleted
        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;

        default:
            console.log(`No event matched. Unhandled event type ${event.type}`);
            break;
    }
};

const getPaymentHistory = async (userId: string) => {
    const result = await prisma.payment.findMany({
        where: { userId },
        include: {
            rentalRequest: {
                include: { property: true }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return result;
};

const getPaymentDetails = async (userId: string, isAdmin: boolean, paymentId: string) => {
    const result = await prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: {
            rentalRequest: {
                include: {
                    property: {
                        include: {
                            landlord: {
                                omit: { password: true }
                            },
                            type: true
                        },
                    },
                    tenant: {
                        omit: { password: true }
                    }
                }
            }
        }
    });

    if (!isAdmin && userId !== result.userId)
        throw new Error("You are not permitted to access this resource");

    return result;
};

export const paymentService = {
    createSession,
    confirmPayment,
    getPaymentHistory,
    getPaymentDetails
};