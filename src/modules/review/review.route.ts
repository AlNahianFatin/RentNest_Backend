import { Router } from "express";
import { reviewController } from "./review.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/", auth(Role.TENANT), reviewController.createReview);

router.patch("/:id", auth(Role.TENANT), reviewController.updateReview);

router.delete("/:id", auth(Role.TENANT), reviewController.deleteReview);

export const reviewRoutes = router;