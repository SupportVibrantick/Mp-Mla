import { Router } from "express";
import accountsRouter from "./accounts.js";
import postsRouter from "./posts.js";
import oauthRouter, { publicOAuthCallbackRouter } from "./oauth.js";

const router = Router();

router.use("/accounts", accountsRouter);
router.use("/posts", postsRouter);
router.use("/oauth", oauthRouter);

export { publicOAuthCallbackRouter };
export default router;
