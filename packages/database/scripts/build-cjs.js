#!/usr/bin/env node
// Build the database package CJS wrapper so NestJS runtime can require() it.
// The Prisma generated client is already CJS JS; we just need to wrap the singleton.
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;

const clientExports = require("../generated/client");
Object.keys(clientExports).forEach(function (key) {
  if (key !== "default" && !Object.prototype.hasOwnProperty.call(exports, key)) {
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () { return clientExports[key]; }
    });
  }
});

const { PrismaClient } = require("../generated/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma || new PrismaClient({ log: ["error"] });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = exports.prisma;
}
`;

fs.writeFileSync(path.join(distDir, "index.js"), content);
console.log("Built packages/database/dist/index.js");
