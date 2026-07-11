import { Router } from "express";
import { rentalController } from "./rental.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/", auth(Role.TENANT), rentalController.submitRentalRequest);

router.get("/", auth(Role.TENANT), rentalController.getMyRentalRequests);

router.get("/:id", auth(Role.ADMIN, Role.TENANT), rentalController.getRentalRequest);

export const rentalRoutes = router;