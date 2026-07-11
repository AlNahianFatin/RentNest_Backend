import { ReviewStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const submitRentalRequest = async (userId: string, propertyId: string) => {
    const property = await prisma.property.findUniqueOrThrow({
        where: { id: propertyId }
    });

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

const getMyRentalRequests = async (userId: string) => {
    const result = await prisma.rentalRequest.findMany({
        where: { tenantId: userId },
        include: {
            property: true,
            landlord: {
                omit: { password: true }
            },
            payment: true,
        }
    });

    return result;
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
    getRentalRequest
};