import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signToken, verifyToken, getAuthUserFromHeader } from "./auth";

describe("auth", () => {
  describe("hashPassword + verifyPassword", () => {
    it("hashes and verifies correctly", async () => {
      const hash = await hashPassword("MySecretPass123");
      expect(hash).not.toBe("MySecretPass123");
      expect(hash.length).toBeGreaterThan(20);

      const valid = await verifyPassword("MySecretPass123", hash);
      expect(valid).toBe(true);
    });

    it("rejects wrong password", async () => {
      const hash = await hashPassword("CorrectPassword");
      const valid = await verifyPassword("WrongPassword", hash);
      expect(valid).toBe(false);
    });

    it("produces different hashes for same password (salt)", async () => {
      const hash1 = await hashPassword("SamePass");
      const hash2 = await hashPassword("SamePass");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("signToken + verifyToken", () => {
    it("signs and verifies a JWT payload", () => {
      const payload = { userId: "user-123", email: "test@example.com" };
      const token = signToken(payload);

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe("user-123");
      expect(decoded!.email).toBe("test@example.com");
    });

    it("returns null for invalid token", () => {
      expect(verifyToken("invalid.token.here")).toBeNull();
      expect(verifyToken("")).toBeNull();
    });

    it("returns null for tampered token", () => {
      const token = signToken({ userId: "user-1", email: "a@b.com" });
      const tampered = token.slice(0, -5) + "XXXXX";
      expect(verifyToken(tampered)).toBeNull();
    });
  });

  describe("getAuthUserFromHeader", () => {
    it("extracts user from Bearer token", () => {
      const token = signToken({ userId: "u1", email: "test@test.com" });
      const request = new Request("http://localhost", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = getAuthUserFromHeader(request);
      expect(user).not.toBeNull();
      expect(user!.userId).toBe("u1");
    });

    it("extracts user from cookie header", () => {
      const token = signToken({ userId: "u2", email: "test2@test.com" });
      const request = new Request("http://localhost", {
        headers: { cookie: `token=${token}; other=val` },
      });
      const user = getAuthUserFromHeader(request);
      expect(user).not.toBeNull();
      expect(user!.userId).toBe("u2");
    });

    it("returns null when no auth info present", () => {
      const request = new Request("http://localhost");
      expect(getAuthUserFromHeader(request)).toBeNull();
    });

    it("returns null for invalid Bearer token", () => {
      const request = new Request("http://localhost", {
        headers: { Authorization: "Bearer garbage" },
      });
      expect(getAuthUserFromHeader(request)).toBeNull();
    });

    it("prefers Authorization header over cookie", () => {
      const token1 = signToken({ userId: "header-user", email: "h@h.com" });
      const token2 = signToken({ userId: "cookie-user", email: "c@c.com" });
      const request = new Request("http://localhost", {
        headers: {
          Authorization: `Bearer ${token1}`,
          cookie: `token=${token2}`,
        },
      });
      const user = getAuthUserFromHeader(request);
      expect(user!.userId).toBe("header-user");
    });
  });
});
