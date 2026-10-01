import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import pinoHttp from "pino-http";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { rateLimit } from "express-rate-limit";

import { env } from "./config/env.js";

import {
  ensureCsrf,
  verifyCsrf,
} from "./middleware/csrf.js";

import {
  errorHandler,
  notFound,
} from "./middleware/error.js";

import {
  requestContext,
} from "./middleware/request-context.js";

import {
  authRouter,
} from "./routes/auth.routes.js";

import {
  publicRouter,
} from "./routes/public.routes.js";

import {
  adminRouter,
} from "./routes/admin.routes.js";

import {
  judgeRouter,
} from "./routes/judge.routes.js";

import {
  paymentRouter,
} from "./routes/payment.routes.js";


export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");


  app.use(
    pinoHttp({
      genReqId: (req) =>
        req.headers["x-request-id"] ||
        crypto.randomUUID(),
    }),
  );


  app.use(requestContext);


  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );


  app.use(compression());


  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      allowedHeaders: [
        "Content-Type",
        "X-XSRF-TOKEN",
        "X-Request-ID",
      ],
    }),
  );


  app.use(
    cookieParser(),
  );


  app.use(
    session({
      name: "sbk.sid",

      secret:
        env.sessionSecret,

      resave: false,

      saveUninitialized:
        false,

      rolling: true,

      cookie: {
        httpOnly: true,

        secure:
          env.nodeEnv ===
          "production",

        sameSite:
          "lax",

        maxAge:
          8 *
          60 *
          60 *
          1000,
      },

      store:
        MongoStore.create({
          mongoUrl:
            env.mongodbUri,

          collectionName:
            "sessions",

          ttl:
            8 *
            60 *
            60,

          autoRemove:
            "native",
        }),
    }),
  );


  app.use(
    ensureCsrf,
  );


  app.use(
    "/api/payments",

    express.raw({
      type:
        "application/json",

      limit:
        "1mb",
    }),

    paymentRouter,
  );


  app.use(
    express.json({
      limit: "8mb",
    }),
  );


  app.use(
    express.urlencoded({
      extended: false,
      limit: "1mb",
    }),
  );


  app.use(
    verifyCsrf,
  );


  app.use(
    "/api",

    rateLimit({
      windowMs:
        60 * 1000,

      limit: 300,

      standardHeaders:
        true,

      legacyHeaders:
        false,
    }),
  );


  app.get(
    "/api/health",

    (req, res) =>
      res.json({
        ok: true,

        time:
          new Date()
            .toISOString(),
      }),
  );


  app.use(
    "/api/auth",
    authRouter,
  );

  app.use(
    "/api",
    publicRouter,
  );

  app.use(
    "/api/admin",
    adminRouter,
  );

  app.use(
    "/api/judge",
    judgeRouter,
  );


  // --------------------------------------------------
  // MEDIA FROM MONGODB GRIDFS
  // --------------------------------------------------

  app.get(
    `${env.mediaPublicPath}/:id`,

    async (
      req,
      res,
      next,
    ) => {
      try {
        const id =
          req.params.id;


        if (
          !mongoose.Types.ObjectId.isValid(
            id,
          )
        ) {
          return res
            .status(404)
            .json({
              error: {
                code:
                  "MEDIA_NOT_FOUND",

                message:
                  "Image not found.",
              },
            });
        }


        if (
          mongoose.connection
            .readyState !== 1 ||
          !mongoose.connection.db
        ) {
          return res
            .status(503)
            .json({
              error: {
                code:
                  "DATABASE_NOT_READY",

                message:
                  "Database is not ready.",
              },
            });
        }


        const bucket =
          new mongoose.mongo.GridFSBucket(
            mongoose.connection.db,
            {
              bucketName:
                "media",
            },
          );


        const fileId =
          new mongoose.Types.ObjectId(
            id,
          );


        const file =
          await bucket
            .find({
              _id: fileId,
            })
            .next();


        if (!file) {
          return res
            .status(404)
            .json({
              error: {
                code:
                  "MEDIA_NOT_FOUND",

                message:
                  "Image not found.",
              },
            });
        }


        res.setHeader(
          "Content-Type",
          file.contentType ||
            file.metadata
              ?.contentType ||
            "image/webp",
        );


        res.setHeader(
          "Cache-Control",
          env.nodeEnv ===
            "production"
            ? "public, max-age=604800"
            : "no-cache",
        );


        const stream =
          bucket.openDownloadStream(
            fileId,
          );


        stream.on(
          "error",
          next,
        );


        stream.pipe(
          res,
        );
      } catch (error) {
        next(error);
      }
    },
  );


  app.use(
    "/api",
    notFound,
  );


  app.use(
    errorHandler,
  );


  return app;
}