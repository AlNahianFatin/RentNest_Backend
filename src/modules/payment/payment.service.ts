import { prisma } from "../../lib/prisma";
import { PaymentStatus, PropertyStatus, RentalStatus, RequestStatus, ReviewStatus } from "../../../generated/prisma/enums";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import { handleCheckoutCompleted, handleInvoicePaymentFailed, handleInvoicePaymentSucceeded, handleSubscriptionDeleted, handleSubscriptionUpdated } from "../../utils/payment.utils";
import { IPropertyQuery } from "./payment.interface";
import { PropertyWhereInput } from "../../../generated/prisma/models";

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
            success_url: `${config.app_url}/tenant-dashboard/my-rental-requests?success=Property rented successfully`,
            cancel_url: `${config.app_url}/tenant-dashboard/my-rental-requests?error=Something went wrong`,
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

const getPaymentHistory = async (userId: string, query: IPropertyQuery) => {
    await prisma.payment.updateMany({
        where: {
            userId,
            paymentStatus: PaymentStatus.COMPLETED,
            currentPeriodEnd: { lt: new Date() }
        },
        data: { rentalStatus: RentalStatus.EXPIRED }
    });

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "currentPeriodEnd";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

    // const andConditions: PropertyWhereInput[] = [];

    // if (query.search) {
    //     andConditions.push({
    //         OR: [
    //             {
    //                 location: {
    //                     contains: query.search,
    //                     mode: "insensitive"
    //                 }
    //             }
    //         ]
    //     })
    // }

    // if (query.status)
    //     andConditions.push({ status: query.status });

    // if (query.price)
    //     andConditions.push({ price: query.price });

    // if (query.type)
    //     andConditions.push({ type: query.type });

    // andConditions.push({ landlordId: userId });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [records, totalCurrentRecordCount, totalRecordCount] = await Promise.all([
            tx.payment.findMany({
                where: {
                    userId,
                    paymentStatus: PaymentStatus.COMPLETED,
                    // currentPeriodEnd: { lt: new Date() }
                },
                include: {
                    rentalRequest: {
                        include: {
                            property: {
                                include: {
                                    reviews: {
                                        where: {
                                            reviewerId: userId,
                                            // status: ReviewStatus.APPROVED
                                        }
                                    }
                                }
                            },
                            landlord: {
                                omit: { password: true }
                            }
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            // await tx.property.count({ where: { status: PropertyStatus.AVAILABLE } }),

            // await tx.property.count({ where: { status: PropertyStatus.RENTED } }),

            tx.payment.count({
                where: {
                    userId,
                    paymentStatus: PaymentStatus.COMPLETED,
                    rentalStatus: RentalStatus.ACTIVE
                }
            }),

            tx.payment.count({
                where: {
                    userId,
                    paymentStatus: PaymentStatus.COMPLETED
                    // currentPeriodEnd: { lt: new Date() }
                }
            })
        ])

        return { records, totalCurrentRecordCount, totalRecordCount };
    });

    return {
        data: transactionResult.records,
        meta: {
            page: page,
            limit: limit,
            totalCurrentRecordCount: transactionResult.totalCurrentRecordCount,
            totalRecordCount: transactionResult.totalRecordCount,
            totalPageCount: Math.ceil(transactionResult.totalRecordCount / limit)
        }
    };
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