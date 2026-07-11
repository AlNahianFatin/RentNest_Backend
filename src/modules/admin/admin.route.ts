import { Router } from "express";
import { adminController } from "./admin.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.get("/users", auth(Role.ADMIN), adminController.getUsers);

router.patch("/users/:id", auth(Role.ADMIN), adminController.updateUserStatus);

router.get("/properties", auth(Role.ADMIN), adminController.getProperties);

router.get("/rentals", auth(Role.ADMIN), adminController.getRentalRequests);

export const adminRoutes = router;