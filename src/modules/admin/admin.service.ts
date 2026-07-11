import { prisma } from "../../lib/prisma";
import { ActiveStatus } from "../../../generated/prisma/enums";
import { IPropertyQuery, IRentalRequestQuery, IUserQuery } from "./admin.interface";
import { PropertyWhereInput, RentalRequestWhereInput, UserWhereInput } from "../../../generated/prisma/models";

const getUsers = async (query: IUserQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: UserWhereInput[] = [];

    if (query.search) {
        andConditions.push({
            OR: [
                {
                    name: {
                        contains: query.search,
                        mode: "insensitive"
                    }
                },
                {
                    email: {
                        contains: query.search,
                        mode: "insensitive"
                    }
                }
            ]
        })
    }

    if (query.activeStatus)
        andConditions.push({ activeStatus: query.activeStatus });

    if (query.role)
        andConditions.push({ role: query.role });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [users, totalUserCount] = await Promise.all([
            await tx.user.findMany({
                where: {
                    AND: andConditions
                },

                include: {
                    properties: true,
                    payments: true,
                    reviews: {
                        include: {
                            reviewer: {
                                omit: { password: true }
                            }
                        }
                    },
                    tenantRequests: true,
                    landlordRequests: true
                },

                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            await tx.user.count({ where: { AND: andConditions } })
        ])

        return { users, totalUserCount };
    });

    return {
        data: transactionResult.users,
        meta: {
            page: page,
            limit: limit,
            totalPostCount: transactionResult.totalUserCount,
            totalPageCount: Math.ceil(transactionResult.totalUserCount / limit)
        }
    };
};

const updateUserStatus = async (userId: string, updatedStatus: ActiveStatus) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId }
    });

    if (user.activeStatus === updatedStatus)
        throw new Error(`The user is already ${updatedStatus}.`);

    const result = await prisma.user.update({
        where: { id: userId },
        data: { activeStatus: updatedStatus }
    });

    return result;
};

const getProperties = async (query: IPropertyQuery) => {
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

    if (query.location)
        andConditions.push({ location: query.location });

    if (query.price)
        andConditions.push({ price: query.price });

    if (query.type)
        andConditions.push({ type: query.type });

    if (query.status)
        andConditions.push({ status: query.status });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [properties, totalPropertyCount] = await Promise.all([
            await tx.property.findMany({
                where: {
                    AND: andConditions
                },

                include: {
                    landlord: {
                        omit: { password: true }
                    },
                    reviews: {
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

            await tx.property.count({ where: { AND: andConditions } })
        ])

        return { properties, totalPropertyCount };
    });

    return {
        data: transactionResult.properties,
        meta: {
            page: page,
            limit: limit,
            totalPostCount: transactionResult.totalPropertyCount,
            totalPageCount: Math.ceil(transactionResult.totalPropertyCount / limit)
        }
    };
};

const getRentalRequests = async (query: IRentalRequestQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc";

    const andConditions: RentalRequestWhereInput[] = [];

    if (query.status)
        andConditions.push({ status: query.status });

    const transactionResult = await prisma.$transaction(async (tx) => {
        const [rentalRequests, totalRentalRequestCount] = await Promise.all([
            await tx.rentalRequest.findMany({
                where: {
                    AND: andConditions
                },

                include: {
                    property: true,
                    landlord: {
                        omit: { password: true }
                    },
                    tenant: {
                        omit: { password: true }
                    },
                    payment: true
                },

                orderBy: { [sortBy]: sortOrder },

                take: limit,
                skip: skip
            }),

            await tx.rentalRequest.count({ where: { AND: andConditions } })
        ])

        return { rentalRequests, totalRentalRequestCount };
    });

    return {
        data: transactionResult.rentalRequests,
        meta: {
            page: page,
            limit: limit,
            totalPostCount: transactionResult.totalRentalRequestCount,
            totalPageCount: Math.ceil(transactionResult.totalRentalRequestCount / limit)
        }
    };
};

const createCategory = async (propertyType: string) => {
    propertyType = propertyType.trim().toUpperCase();

    const previousCategory = await prisma.category.findUnique({
        where: { propertyType }
    });

    if (previousCategory)
        throw new Error(`Property category ${propertyType} already exists`);

    const result = await prisma.category.create({
        data: { propertyType }
    });

    return result;
}

export const adminService = {
    getUsers,
    updateUserStatus,
    getProperties,
    getRentalRequests,
    createCategory
};