import { PropertyStatus } from "../../../generated/prisma/enums";

export interface ICreateProperty {
    houseNo: number;
    roadNo: number;
    location: string;
    price: number;
    // status: PropertyStatus;
    categoryId: string;
}

export interface IUpdateProperty {
    houseNo?: number;
    roadNo?: number;
    location?: string;
    price?: number;
    status?: PropertyStatus;
    categoryId?: string;
}