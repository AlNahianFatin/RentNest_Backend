import { NextFunction, Request, Response } from "express";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { Role } from "../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                role: Role;
            }
        }
    }
};

export const auth = (...requiredRoles: Role[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken ?
            req.cookies.accessToken :
            req.headers.authorization?.startsWith("Bearer ") ?
                req.headers.authorization?.split(" ")[1] :
                req.headers.authorization;

        if (!token)
            throw new Error("You are not logged in. Please log in to access this resource");

        const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

        if (!verifiedToken.success)
            throw new Error(verifiedToken.error);

        const { id, name, email, role } = verifiedToken.data as JwtPayload;

        if (requiredRoles.length && !requiredRoles.includes(role))
            throw new Error("Forbidden. You don't have permission to access this resource.");

        const user = await prisma.user.findUnique({
            where: {
                id,
                name,
                email,
                role
            }
        });

        if (!user)
            throw new Error("Forbidden. You don't have permission to access this resource.");

        if (user.activeStatus === "BANNED")
            throw new Error("YOur account is banned. Please contact support.");

        req.user = {
            id,
            name,
            email,
            role
        };

        next();
    });
}