import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { PaymentStatus, PropertyStatus } from "../../generated/prisma/enums";

export const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.userId;
    const rentalRequestId = session.metadata?.rentalRequestId!;

    const stripeCustomerId = session.customer as string;
    const stripePaymentId = session.payment_intent as string;

    if (!userId || !stripeCustomerId || !stripePaymentId) {
        console.log("Webhook : Missing values for creating checkout session");
        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
            where: { stripePaymentId },
            create: {
                status: PaymentStatus.COMPLETED,

                stripeCustomerId,
                stripePaymentId,

                rentalRequestId,
                userId
            },
            update: {
                status: PaymentStatus.COMPLETED,

                stripeCustomerId
            }
        });

        const rentalRequest = await tx.rentalRequest.findUniqueOrThrow({
            where: { id: rentalRequestId }
        });

        await tx.property.update({
            where: { id: rentalRequest.propertyId },
            data: { status: PropertyStatus.SOLD }
        });
    });
}

export const handleFailedOrExpiredPayment = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.userId;
    const rentalRequestId = session.metadata?.rentalRequestId;

    if (!userId || !rentalRequestId) {
        console.log("Missing metadata.");
        return;
    }

    const stripeCustomerId = session.customer as string;

    const stripePaymentId =
        typeof session.payment_intent === "string"
            ? session.payment_intent
            : `failed_${session.id}`;

    await prisma.payment.upsert({
        where: { stripePaymentId },
        create: {
            status: PaymentStatus.FAILED,

            stripeCustomerId,
            stripePaymentId,

            rentalRequestId,
            userId
        },
        update: { status: PaymentStatus.FAILED }
    });
}