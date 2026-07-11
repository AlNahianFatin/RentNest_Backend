import { prisma } from "../../lib/prisma";
import { ICreateProperty, IUpdateProperty } from "./landlord.interface";
import { PaymentStatus, PropertyStatus, RequestStatus, ReviewStatus } from "../../../generated/prisma/enums";
import { stripe } from "../../lib/stripe";

const createProperty = async (userId: string, payload: ICreateProperty) => {
    payload.houseNo = Number(payload.houseNo);
    payload.roadNo = Number(payload.roadNo);
    payload.price = Number(payload.price);

    const transactionResult = await prisma.$transaction(async (tx) => {
        // creating stripe product
        const stripeProduct = await stripe.products.create({
            name: `Property houseNo${payload.houseNo} roadNo${payload.roadNo}`,
            description: payload.location,
        });

        // creating stripe price
        const stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Number(payload.price) * 100,
            currency: "bdt",
        });

        // inserting property
        return await tx.property.create({
            data: {
                ...payload,
                stripeProductId: stripeProduct.id,
                stripePriceId: stripePrice.id,
                landlordId: userId
            },
            include: {
                landlord: {
                    omit: { password: true }
                },
                type: true
            }
        });
    });

    return transactionResult;
}

const updateProperty = async (userId: string, propertyId: string, payload: IUpdateProperty) => {
    payload.houseNo = Number(payload.houseNo);
    payload.roadNo = Number(payload.roadNo);
    payload.price = Number(payload.price);

    // fetching previous record first to get the stripe product id
    const property = await prisma.property.findUniqueOrThrow({
        where: { id: propertyId }
    });

    if (userId !== property.landlordId)
        throw new Error("You are not the owner of the property. So you can not update it.");

    const transactionResult = await prisma.$transaction(async (tx) => {
        // updating stripe product
        const stripeProduct = await stripe.products.update(property.stripeProductId, {
            name: `Property houseNo${payload.houseNo} roadNo${payload.roadNo}`,
            description: payload.location,
        });

        let stripePrice;
        // checking if price has been updated or not
        if (payload?.price !== property.price) {
            // deactivating previous stripe price if price is updated
            await stripe.prices.update(property.stripePriceId, { active: false });

            // creating new stripe price
            stripePrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: Number(payload.price) * 100,
                currency: "bdt",
            });
        }

        // updating property
        return await tx.property.update({
            where: { id: propertyId },
            data: {
                ...payload,
                stripePriceId: stripePrice?.id
            },
            include: {
                landlord: {
                    omit: { password: true }
                },
                reviews: {
                    where: { status: ReviewStatus.APPROVED }
                },
                type: true
            }
        });
    });

    return transactionResult;
}

const deleteProperty = async (userId: String, propertyId: string) => {
    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });

    if (userId !== property.landlordId)
        throw new Error("You are not the owner of the property. So you can not delete it.");

    await prisma.$transaction(async (tx) => {
        // deactivating stripe product
        await stripe.products.update(property.stripeProductId, { active: false });

        // deactivating stripe price
        await stripe.prices.update(property.stripePriceId, { active: false });

        // deleting property
        await tx.property.delete({ where: { id: propertyId } });
    });
}

const getRequests = async (userId: string) => {
    const transactionResult = await prisma.$transaction(async (tx) => {
        const [result, totalPendingRequests] = await Promise.all([
            await prisma.rentalRequest.findMany({
                where: {
                    landlordId: userId,
                    status: RequestStatus.PENDING && RequestStatus.REJECTED
                },
                include: {
                    property: true,
                    tenant: {
                        omit: { password: true }
                    }
                }
            }),

            await prisma.rentalRequest.count({
                where: {
                    landlordId: userId,
                    status: RequestStatus.PENDING
                }
            })
        ]);

        return { result, totalPendingRequests };
    });

    return transactionResult;
}

const manageRequest = async (userId: string, requestId: string, status: RequestStatus) => {
    const rentalRequest = await prisma.rentalRequest.findUniqueOrThrow({ where: { id: requestId } });

    if (userId !== rentalRequest.landlordId)
        throw new Error("You are not the owner of the property. So you can not manage its requests.");

    if (status === RequestStatus.PENDING)
        throw new Error("You must accept or reject a request.");

    if (status === rentalRequest.status)
        throw new Error("Change rental request status to update");

    const transactionResult = await prisma.$transaction(async (tx) => {
        if (status === RequestStatus.ACCEPTED) {
            await tx.payment.update({
                where: { id: rentalRequest.propertyId },
                data: { status: PaymentStatus.PENDING }
            });
        }

        const result = await tx.rentalRequest.update({
            where: { id: requestId },
            data: { status }
        });

        return result;
    });

    return transactionResult;
}

export const landlordService = {
    createProperty,
    updateProperty,
    deleteProperty,
    getRequests,
    manageRequest
};