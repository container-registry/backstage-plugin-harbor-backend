import request from "supertest";
import { createRouter } from "./router";
import express from "express";
import { ConfigReader } from "@backstage/config";
import { getVoidLogger } from "@backstage/backend-common";

describe("createRouter", () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      config: new ConfigReader({
        harbor: {
          baseUrl: process.env.APP_CONFIG_harbor_baseUrl,
          username: process.env.APP_CONFIG_harbor_username,
          password: process.env.APP_CONFIG_harbor_password,
        },
      }),
    });
    app = express().use(router);
  });

  describe("GET /health", () => {
    it("returns ok", async () => {
      const response = await request(app).get("/health");

      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({ status: "ok" });
    });
  });

  describe("GET /artifacts", () => {
    it("return repository info", async () => {
      const response = await request(app)
        .get("/artifacts")
        .query({ project: "es", repository: "pipectl" });

      expect(response.statusCode).toEqual(200);
      expect(Array.isArray(response.body)).toBeTruthy();

      expect(response.body[0]).toHaveProperty("size");
      expect(response.body[0]).toHaveProperty("tag");
      expect(response.body[0]).toHaveProperty("pullTime");
      expect(response.body[0]).toHaveProperty("pushTime");
      expect(response.body[0]).toHaveProperty("projectID");
      expect(response.body[0]).toHaveProperty("repoUrl");
      expect(response.body[0]).toHaveProperty("vulnerabilities");
    });
  });
});
