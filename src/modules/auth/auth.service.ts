import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { ILoginUser, IRegisterUser } from "./auth.interface";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";

const registerUser = async (payload: IRegisterUser) => {
    let { name, email, password, role } = payload;
    
    const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

    const createUser: IRegisterUser = { name, email, password: hashedPassword, role };

    const result = await prisma.user.create({
        data: { ...createUser },
        omit: { password: true }
    })

    return result;
}

const loginUser = async (payload: ILoginUser) => {
    const { email, password } = payload;

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    if (user.activeStatus === "BLOCKED")
        throw new Error("Your account is blocked. Please contact support.");

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched)
        throw new Error("Password is incorrect");

    const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions);

    const refreshToken = jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions);

    return { accessToken, refreshToken };
};

const refreshToken = async (refreshToken: string) => {
    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_secret);

    if (!verifiedRefreshToken.success)
        throw new Error(verifiedRefreshToken.error);

    const { id } = verifiedRefreshToken.data as JwtPayload;

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });

    if (user.activeStatus === "BLOCKED")
        throw new Error("Your account is blocked. Please contact support.");

    const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };

    const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions);

    return { accessToken };
};

const myProfile = async (userId: string) => {
    const result = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
            properties: {
                include: { category: true }
            },
            payments: true,
            reviews: true,
            tenantRequests: true,
            landlordRequests: true
        },
        omit: { password: true }
    });

    return result;
}

export const authService = {
    registerUser,
    loginUser,
    refreshToken,
    myProfile
};