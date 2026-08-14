import { prisma } from "../../lib/prisma";
import { ICreateProperty, IUpdateProperty, IRentalQuery, IPropertyQuery } from "./landlord.interface";
import { PaymentStatus, PropertyStatus, RequestStatus, ReviewStatus } from "../../../generated/prisma/enums";
import { stripe } from "../../lib/stripe";
import { PaymentWhereInput, PropertyWhereInput, RentalRequestWhereInput } from "../../../generated/prisma/models";

const getMyProperties = async (userId: string, query: IPropertyQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: PropertyWhereInput[] = [];

    if (query.search) {
        andConditions.push({
            OR: [
                {
                    location: {
                        contains: query.search,
                        mode: "insensitive"
                    }
                }
            ]
        })
    }

    if (query.status)
        andConditions.push({ status: query.status });

    if (query.price)
        andConditions.push({ price: query.price });

    if (query.type)
        andConditions.push({ type: query.type });

    andConditions.push({ landlordId: userId });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [properties, totalAvailablePropertyCount, totalRentedPropertyCount, totalPropertyCount] = await Promise.all([
            await tx.property.findMany({
                where: { AND: andConditions },

                include: {
                    landlord: {
                        omit: { password: true }
                    },

                    rentalRequests: {
                        include: {
                            tenant: {
                                omit: { password: true }
                            },
                            payment: {
                                select: { currentPeriodEnd: true }
                            }
                        },
                        orderBy: {
                            payment: { currentPeriodEnd: "desc" }
                        }
                    },

                    reviews: {
                        where: { status: ReviewStatus.APPROVED },
                        include: {
                            reviewer: {
                                omit: { password: true }
                            }
                        }
                    },
                    type: true
                },

                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            await tx.property.count({
                where: {
                    landlordId: userId,
                    status: PropertyStatus.AVAILABLE
                }
            }),

            await tx.property.count({
                where: {
                    landlordId: userId,
                    status: PropertyStatus.RENTED
                }
            }),

            await tx.property.count({
                where: {
                    landlordId: userId,
                    // AND: andConditions
                }
            }),
        ])

        return { properties, totalAvailablePropertyCount, totalRentedPropertyCount, totalPropertyCount };
    });

    return {
        data: transactionResult.properties,
        meta: {
            page: page,
            limit: limit,
            totalAvailablePropertyCount: transactionResult.totalAvailablePropertyCount,
            totalRentedPropertyCount: transactionResult.totalRentedPropertyCount,
            totalPropertyCount: transactionResult.totalPropertyCount,
            totalPageCount: Math.ceil(transactionResult.totalPropertyCount / limit)
        }
    };
}

const getMyRentals = async (userId: string, query: IRentalQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "currentPeriodEnd";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: PaymentWhereInput[] = [];

    if (query.paymentStatus)
        andConditions.push({ paymentStatus: query.paymentStatus });

    if (query.rentalStatus)
        andConditions.push({ rentalStatus: query.rentalStatus });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [rentals, totalRent, totalRentalCount] = await Promise.all([
            await tx.payment.findMany({
                where: {
                    AND: andConditions,
                    rentalRequest: { landlordId: userId }
                },

                include: {
                    rentalRequest: {
                        include: {
                            tenant: {
                                omit: { password: true }
                            },
                            property: {
                                include: {
                                    reviews: {
                                        where: { status: ReviewStatus.APPROVED },
                                        include: {
                                            reviewer: {
                                                omit: { password: true }
                                            }
                                        }
                                    },
                                    type: true
                                }
                            }
                        }
                    }
                },

                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            await tx.property.aggregate({
                where: {
                    landlordId: userId,
                    status: PropertyStatus.RENTED
                },
                _sum: { price: true }
            }),

            await tx.payment.count({
                where: {
                    AND: [
                        ...andConditions,
                        {
                            rentalRequest: {
                                landlordId: userId,
                                property: { status: PropertyStatus.RENTED }
                            }
                        }
                    ]
                }
            })
        ])

        return { rentals, totalRent, totalRentalCount };
    });

    return {
        data: transactionResult.rentals,
        meta: {
            page: page,
            limit: limit,
            totalRent: transactionResult.totalRent,
            totalRentalCount: transactionResult.totalRentalCount,
            totalPageCount: Math.ceil(transactionResult.totalRentalCount / limit)
        }
    };
}

const createProperty = async (userId: string, payload: ICreateProperty) => {
    if (!Number.isInteger(payload.houseNo))
        throw new Error("House No must be integer");

    if (!Number.isInteger(payload.roadNo))
        throw new Error("Road No must be integer");

    if (!Number.isInteger(payload.price))
        throw new Error("Price must be integer");

    if (payload.price <= 0)
        throw new Error("Invalid price");

    if (payload.price > Math.floor(99999999 / 100))
        throw new Error(`Price too large, Price cannot exceed ${Math.floor(99999999 / 100)}`);

    const transactionResult = await prisma.$transaction(async (tx) => {
        // getting the category name
        const categoryName = await tx.category.findUniqueOrThrow({
            where: { id: payload.categoryId },
            select: { propertyType: true }
        });

        // creating stripe product
        const stripeProduct = await stripe.products.create({
            name: `${categoryName.propertyType} houseNo${payload.houseNo} roadNo${payload.roadNo}`,
            description: payload.location,
        });

        // creating stripe price
        const stripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: Number(payload.price) * 100,
            currency: "bdt",
            recurring: { interval: "month" }
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
    if (payload.houseNo) {
        if (!Number.isInteger(payload.houseNo))
            throw new Error("House No must be integer");
    }

    if (payload.roadNo) {
        if (!Number.isInteger(payload.roadNo))
            throw new Error("Road No must be integer");
    }

    if (payload.price) {
        if (!Number.isInteger(payload.price))
            throw new Error("Price must be integer");

        if (payload.price <= 0)
            throw new Error("Invalid price");

        if (payload.price >= Math.floor(99999999 / 100))
            throw new Error(`Price too large, Price cannot exceed ${Math.floor(99999999 / 100)}`);
    }

    // fetching previous record first to get the stripe product id
    const property = await prisma.property.findUniqueOrThrow({
        where: { id: propertyId },
        include: { type: true }
    });

    if (userId !== property.landlordId)
        throw new Error("You are not the owner of the property. So you can not update it.");

    const transactionResult = await prisma.$transaction(async (tx) => {
        // getting the category name
        let categoryName = property.type.propertyType;
        if (payload.categoryId) {
            const category = await tx.category.findUniqueOrThrow({
                where: { id: payload.categoryId },
                select: { propertyType: true }
            });
            categoryName = category.propertyType;
        }

        // updating stripe product
        const stripeProduct = await stripe.products.update(property.stripeProductId, {
            name: `${categoryName} houseNo${payload.houseNo} roadNo${payload.roadNo}`,
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
                recurring: { interval: "month" }
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

    if (property.status === PropertyStatus.RENTED)
        throw new Error(`Your property "${property.location}" is currently rented. So it can't be removed from record`);

    await prisma.$transaction(async (tx) => {
        // deactivating stripe product
        await stripe.products.update(property.stripeProductId, { active: false });

        // deactivating stripe price
        await stripe.prices.update(property.stripePriceId, { active: false });

        // deleting property
        await tx.property.delete({ where: { id: propertyId } });
    });
}

const getRequests = async (userId: string, query: IPropertyQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const allowedSortFields = [
        "createdAt",
        "updatedAt",
        "status"
    ];

    const sortBy =
        allowedSortFields.includes(query.sortBy as string)
            ? query.sortBy as string
            : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [result, totalPendingRentalRequestCount, totalAcceptedRentalRequestCount, totalRejectedRentalRequestCount, totalRentalRequestCount] = await Promise.all([
            tx.rentalRequest.findMany({
                where: { landlordId: userId },
                include: {
                    property: {
                        // where: { AND: andConditions },
                        include: {
                            type: true
                        }
                    },
                    tenant: {
                        omit: { password: true }
                    },
                    payment: true
                },
                orderBy: { [sortBy]: sortOrder || RequestStatus.PENDING || RequestStatus.PENDING || RequestStatus.ACCEPTED },

                take: limit,
                skip: skip
            }),

            tx.rentalRequest.count({
                where: {
                    landlordId: userId,
                    status: RequestStatus.PENDING
                }
            }),

            tx.rentalRequest.count({
                where: {
                    landlordId: userId,
                    status: RequestStatus.ACCEPTED
                }
            }),

            tx.rentalRequest.count({
                where: {
                    landlordId: userId,
                    status: RequestStatus.REJECTED
                }
            }),

            tx.rentalRequest.count({
                where: { landlordId: userId }
            }),
        ]);

        return { result, totalPendingRentalRequestCount, totalAcceptedRentalRequestCount, totalRejectedRentalRequestCount, totalRentalRequestCount };
    });

    return {
        data: transactionResult.result,
        meta: {
            page: page,
            limit: limit,
            totalPendingRentalRequestCount: transactionResult.totalPendingRentalRequestCount,
            totalAcceptedRentalRequestCount: transactionResult.totalAcceptedRentalRequestCount,
            totalRejectedRentalRequestCount: transactionResult.totalRejectedRentalRequestCount,
            totalRentalRequestCount: transactionResult.totalRentalRequestCount,
            totalPageCount: Math.ceil(transactionResult.totalRentalRequestCount / limit)
        }
    };
}

const manageRequest = async (userId: string, requestId: string, status: RequestStatus) => {
    console.log("request at service")
    const rentalRequest = await prisma.rentalRequest.findUniqueOrThrow({ where: { id: requestId } });

    if (userId !== rentalRequest.landlordId)
        throw new Error("You are not the owner of the property. So you can not manage its requests.");

    if (status === RequestStatus.PENDING)
        throw new Error("You must accept or reject a request.");

    if (status === rentalRequest.status)
        throw new Error("Change rental request status to update");

    const transactionResult = await prisma.$transaction(async (tx) => {
        if (status === RequestStatus.ACCEPTED) {
            await tx.rentalRequest.updateMany({
                where: { propertyId: rentalRequest.propertyId },
                data: { status: RequestStatus.REJECTED }
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
    getMyProperties,
    getMyRentals,
    createProperty,
    updateProperty,
    deleteProperty,
    getRequests,
    manageRequest
};