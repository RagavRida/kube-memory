import { Router } from "express";
import { getEnv } from "../config/env.js";
import { loginSchema, registerSchema } from "../schemas/api/auth.js";
import {
  findOrCreateGitHubUser,
  getGitHubAuthUrl,
  loginUser,
  registerUser,
} from "../services/auth/userService.js";
import { sessionAuthMiddleware } from "../middleware/sessionAuth.js";

export const authRouter = Router();

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await registerUser(body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      res.status(409).json({ error: "Registration failed" });
      return;
    }
    next(error);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginUser(body);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid credentials") {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    next(error);
  }
});

authRouter.get("/auth/me", sessionAuthMiddleware, (req, res) => {
  const { user, workspace } = req.session!;
  res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    workspace: {
      id: workspace._id.toString(),
      slug: workspace.slug,
      name: workspace.name,
      cogneeDataset: workspace.cogneeDataset,
    },
  });
});

authRouter.post("/auth/logout", (_req, res) => {
  res.json({ status: "ok" });
});

authRouter.get("/auth/github", (_req, res) => {
  const url = getGitHubAuthUrl();
  if (!url) {
    res.status(503).json({ error: "GitHub OAuth is not configured" });
    return;
  }
  res.redirect(url);
});

// SECURITY-REVIEW: OAuth callback exchanges code for token and redirects with JWT
authRouter.get("/auth/github/callback", async (req, res, next) => {
  try {
    const env = getEnv();
    const code = req.query.code;
    if (typeof code !== "string" || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      res.status(400).json({ error: "Invalid OAuth callback" });
      return;
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      res.status(401).json({ error: "OAuth token exchange failed" });
      return;
    }

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
    };

    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean }>;
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
    }

    const auth = await findOrCreateGitHubUser({
      id: String(profile.id),
      email,
      displayName: profile.name,
      username: profile.login,
    });

    const clientUrl = env.CLIENT_URL ?? "http://localhost:5173";
    const redirect = new URL("/auth/github/callback", clientUrl);
    redirect.searchParams.set("token", auth.token);
    res.redirect(redirect.toString());
  } catch (error) {
    next(error);
  }
});
