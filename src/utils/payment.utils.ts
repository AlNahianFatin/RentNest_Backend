import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { PaymentStatus, PropertyStatus, RentalStatus } from "../../generated/prisma/enums";

export const getStripePeriodEnd = (payload: Stripe.Subscription) => {
    const currentPeriodEndInMilliseconds = payload.items.data[0]?.current_period_end!;

    const currentPeriodEnd = new Date(currentPeriodEndInMilliseconds * 1000);

    return currentPeriodEnd;
}

export const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
    if (session.payment_status !== "paid")
        throw new Error("Something went wrong and payment could not be done.");

    const userId = session.metadata?.userId;
    const rentalRequestId = session.metadata?.rentalRequestId;
    const propertyId = session.metadata?.propertyId;

    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId || !rentalRequestId || !propertyId || !stripeCustomerId || !stripeSubscriptionId)
        throw new Error("Webhook metadata missing.");

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const currentPeriodEnd = getStripePeriodEnd(subscription);

    await prisma.$transaction(async (tx) => {

        const property = await tx.property.findUniqueOrThrow({
            where: { id: propertyId }
        });

        if (property.status === PropertyStatus.RENTED)
            throw new Error("Property already rented.");

        await tx.payment.upsert({
            where: { stripeSubscriptionId },
            create: {
                stripeCustomerId,
                stripeSubscriptionId,

                currentPeriodEnd,

                paymentStatus: PaymentStatus.COMPLETED,
                rentalStatus: RentalStatus.ACTIVE,

                userId,
                rentalRequestId
            },

            update: {
                currentPeriodEnd,

                paymentStatus: PaymentStatus.COMPLETED,
                rentalStatus: RentalStatus.ACTIVE
            }
        });

        await tx.property.update({
            where: { id: propertyId },
            data: { status: PropertyStatus.RENTED }
        });
    });
};

export const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
    const subscriptionId = invoice.parent?.subscription_details?.subscription;

    if (!subscriptionId)
        return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

    await prisma.payment.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
            paymentStatus: PaymentStatus.COMPLETED,

            rentalStatus: RentalStatus.ACTIVE,

            currentPeriodEnd: getStripePeriodEnd(subscription)
        }
    });
};

export const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
    const subscriptionId = invoice.parent?.subscription_details?.subscription;

    if (!subscriptionId)
        return;

    await prisma.payment.update({
        where: { stripeSubscriptionId: subscriptionId as string },

        data: {
            paymentStatus: PaymentStatus.FAILED
        }
    });
};

export const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
    let rentalStatus: RentalStatus = RentalStatus.ACTIVE;
    let propertyStatus: PropertyStatus = PropertyStatus.RENTED;

    switch (subscription.status) {
        case "active":
        case "trialing":
            rentalStatus = RentalStatus.ACTIVE;
            propertyStatus = PropertyStatus.RENTED;
            break;

        case "canceled":
            rentalStatus = RentalStatus.CANCELED;
            propertyStatus = PropertyStatus.AVAILABLE;
            break;

        default:
            rentalStatus = RentalStatus.EXPIRED;
            propertyStatus = PropertyStatus.AVAILABLE;
    }

    await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                rentalStatus,
                currentPeriodEnd: getStripePeriodEnd(subscription)
            },
            include: {
                rentalRequest: {
                    include: { property: true }
                }
            }
        });

        await tx.property.update({
            where: { id: payment.rentalRequest.propertyId },
            data: { status: propertyStatus }
        })
    })
};

export const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
    await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
            where: { stripeSubscriptionId: subscription.id },
            include: { rentalRequest: true }
        });

        await tx.payment.update({
            where: { id: payment.id },
            data: { rentalStatus: RentalStatus.CANCELED }
        });

        await tx.property.update({
            where: { id: payment.rentalRequest.propertyId },
            data: { status: PropertyStatus.AVAILABLE }
        });
    });
};