import { prisma } from "../../lib/prisma";

const getCategories = async () => {
    const result = await prisma.category.findMany({
        include: {
            _count: true
        }
    });
    console.log(result);

    return result;
}

export const categoryService = {
    getCategories
};