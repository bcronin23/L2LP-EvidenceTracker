import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import rateLimit from "express-rate-limit";

const app = express();
const httpServer = createServer(app);

/**
 * ✅ Elastic Beanstalk / ALB health check endpoint
 * Must respond quickly with 200 so EB can mark the instance healthy.
 * Keep this BEFORE any heavy startup work.
 */
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Rate limiting for API endpoints - prevents brute force attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per window
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters - order matters (more specific first)
app.use("/api/login", authLimiter);
app.use("/api/organisation/join", authLimiter);
app.use("/api", apiLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Register API routes first
    await registerRoutes(httpServer, app);

    // Error handler (do NOT throw after responding)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || "Internal Server Error";
      log(`ERROR ${status}: ${message}`, "error");
      res.status(status).json({ message });
    });

    // Serve static in production (built client)
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      // Dev only
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    /**
     * ✅ Beanstalk requirement:
     * Listen on process.env.PORT (set by EB). Default safely to 8080.
     * ✅ IMPORTANT: do NOT use reusePort on EB.
     */
    const port = Number(process.env.PORT) || 8080;

    httpServer.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (e: any) {
    // If startup fails, log it clearly and exit so EB knows it failed
    log(`Startup failed: ${e?.message || e}`, "startup");
    console.error(e);
    process.exit(1);
  }
})();
