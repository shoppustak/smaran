import { Router, type IRouter } from "express";
import { resolveShortLink } from "../lib/short-link";

const router: IRouter = Router();

/**
 * GET /i/:code — invite (referral) short link.
 *
 * Mounted at the ROOT, not under /api: the whole point is a short URL
 * (api.smaran.click/i/AbC12xYz), and "/api" would be a third of the path.
 * Mirrors minibag's /j/:code and /b/:code convention.
 *
 * Server-side 302 rather than minibag's client-side React redirect — these are
 * opened from WhatsApp forwards, often inside a webview, and must not depend on
 * our JS booting.
 */
router.get("/i/:code", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    res.status(503).send("Not configured");
    return;
  }
  try {
    const target = await resolveShortLink(req.params.code);
    if (!target) {
      req.log.info({ code: req.params.code }, "Short link not found or expired");
      res.status(404).send("यह लिंक अब उपलब्ध नहीं है। (Link not available)");
      return;
    }
    // 302, not 301: a permanent redirect would be cached by the browser and make
    // the link impossible to revoke later.
    res.redirect(302, target);
  } catch (err) {
    req.log.error({ err, code: req.params.code }, "Short link resolution failed");
    res.status(500).send("Internal error");
  }
});

export default router;
