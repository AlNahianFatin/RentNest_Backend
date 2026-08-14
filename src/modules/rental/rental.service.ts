import { PropertyStatus, RentalStatus, RequestStatus, ReviewStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { IPropertyQuery } from "./rental.interface";

const submitRentalRequest = async (userId: string, propertyId: string) => {
    const property = await prisma.property.findUniqueOrThrow({
        where: { id: propertyId }
    });

    if (property.status === PropertyStatus.RENTED)
        throw new Error(`Property '${property.location}' is already rented!`);

    const isRequestExist = await prisma.rentalRequest.findFirst({
        where: {
            propertyId,
            tenantId: userId,
            status: RequestStatus.PENDING
        },
        orderBy: { updatedAt: "desc" }
    });
    console.log("Existing request:", isRequestExist);

    if (isRequestExist)
        throw new Error(`You have already requested for this property. Please wait for the landlord to accept it.`);

    const result = await prisma.rentalRequest.create({
        data: {
            propertyId,
            tenantId: userId,
            landlordId: property.landlordId
        },
        include: {
            property: true,
            landlord: {
                omit: { password: true }
            },
            payment: true
        }
    });

    return result;
}

const getMyRentalRequests = async (userId: string, query: IPropertyQuery) => {
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
                where: { tenantId: userId },
                include: {
                    property: {
                        // where: { AND: andConditions },
                        include: {
                            landlord: {
                                omit: { password: true }
                            },
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
                    tenantId: userId,
                    status: RequestStatus.PENDING
                }
            }),

            tx.rentalRequest.count({
                where: {
                    tenantId: userId,
                    status: RequestStatus.ACCEPTED
                }
            }),

            tx.rentalRequest.count({
                where: {
                    tenantId: userId,
                    status: RequestStatus.REJECTED
                }
            }),

            tx.rentalRequest.count({
                where: { tenantId: userId }
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

const getMyRents = async (userId: string, query: IPropertyQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [rents, rentThisMonth, totalPropertiesCount] = await Promise.all([
            tx.property.findMany({
                where: {
                    rentalRequests: {
                        some: {
                            tenantId: userId,
                            payment: { rentalStatus: RentalStatus.ACTIVE }
                        }
                    }
                },
                include: {
                    rentalRequests: {
                        include: { payment: true }
                    },
                    landlord: {
                        omit: { password: true }
                    },
                    type: true
                }
            }),

            tx.property.aggregate({
                _sum: {
                    price: true
                },
                where: {
                    rentalRequests: {
                        some: {
                            tenantId: userId,
                            payment: { rentalStatus: RentalStatus.ACTIVE }
                        }
                    }
                }
            }),

            tx.rentalRequest.count({
                where: {
                    tenantId: userId,
                    payment: { rentalStatus: RentalStatus.ACTIVE }
                }
            }),
        ])

        return { rents, rentThisMonth, totalPropertiesCount };
    })

    return {
        data: transactionResult.rents,
        meta: {
            page: page,
            limit: limit,
            rentThisMonth: transactionResult.rentThisMonth,
            totalPropertiesCount: transactionResult.totalPropertiesCount,
            totalPageCount: Math.ceil(transactionResult.totalPropertiesCount / limit)
        }
    };
};

const getRentalRequest = async (userId: string, isAdmin: boolean, requestId: string) => {
    const result = await prisma.rentalRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: {
            property: {
                include: {
                    reviews: {
                        where: { status: ReviewStatus.APPROVED },
                        include: {
                            reviewer: {
                                omit: { password: true }
                            }
                        }
                    }
                }
            },
            tenant: {
                omit: { password: true }
            },
            landlord: {
                omit: { password: true }
            },
            payment: true,
        }
    });

    if (!isAdmin && result.tenantId !== userId)
        throw new Error("You are not permitted to access this resource");

    return result;
};

export const rentalService = {
    submitRentalRequest,
    getMyRentalRequests,
    getMyRents,
    getRentalRequest
};