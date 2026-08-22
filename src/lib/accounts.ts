import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type AccountRecord = {
  id: string;
  username: string;
  name: string;
  email: string;
  /** bcrypt hash of peppered password */
  passwordHash: string;
  phone?: string | null;
  role: "CUSTOMER" | "ADMIN";
  createdAt: string;
};

type AccountsFile = { users: AccountRecord[] };

const ACCOUNTS_PATH = "src/data/accounts.json";
const emptyAccounts = (): AccountsFile => ({ users: [] });

function githubConfig() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo =
    process.env.GITHUB_REPO ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : "amantoon-lang/The-Crafted-Home");
  const branch =
    process.env.GITHUB_CATALOG_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "main";
  return { token, repo, branch };
}

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function pepper(password: string) {
  const secret = process.env.AUTH_SECRET || "the-crafted-home-dev-secret";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(pepper(password), 12);
}

export async function passwordsMatch(password: string, passwordHash: string) {
  if (await bcrypt.compare(pepper(password), passwordHash)) return true;
  // Legacy hashes (seed / older accounts without pepper)
  return bcrypt.compare(password, passwordHash);
}

async function readLocalAccountsFile(): Promise<AccountsFile> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const file = path.join(process.cwd(), ACCOUNTS_PATH);
    const raw = await fs.readFile(file, "utf8");
    const data = JSON.parse(raw) as AccountsFile;
    if (Array.isArray(data?.users)) return data;
  } catch {
    // ignore
  }
  return emptyAccounts();
}

async function loadAccountsFile(): Promise<AccountsFile> {
  const { token, repo, branch } = githubConfig();
  try {
    if (token) {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${ACCOUNTS_PATH}?ref=${encodeURIComponent(branch)}`,
        {
          headers: {
            Accept: "application/vnd.github.raw+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "the-crafted-home",
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const data = (await res.json()) as AccountsFile;
        if (Array.isArray(data?.users)) return data;
      }
    }
  } catch {
    // fall through
  }
  return readLocalAccountsFile();
}

async function saveAccountsFile(
  data: AccountsFile,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const { token, repo, branch } = githubConfig();
  if (!token) {
    // Local/dev: write to disk when possible
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const file = path.join(process.cwd(), ACCOUNTS_PATH);
      await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
      return { ok: true };
    } catch {
      return {
        ok: false,
        error:
          "Account storage is not configured. Set DATABASE_URL or GITHUB_TOKEN so new accounts can be saved.",
      };
    }
  }

  try {
    const metaRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${ACCOUNTS_PATH}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "the-crafted-home",
        },
        cache: "no-store",
      }
    );
    const meta = metaRes.ok ? await metaRes.json() : null;
    const sha = meta?.sha as string | undefined;
    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${ACCOUNTS_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "the-crafted-home",
        },
        body: JSON.stringify({
          message,
          content: Buffer.from(JSON.stringify(data, null, 2) + "\n").toString(
            "base64"
          ),
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
    if (!putRes.ok) {
      const err = await putRes.text();
      return { ok: false, error: err.slice(0, 300) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

export type AuthUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  role: "CUSTOMER" | "ADMIN";
  phone: string | null;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findAuthUserByIdentifier(
  identifier: string
): Promise<(AuthUser & { passwordHash: string | null }) | null> {
  const value = identifier.trim();
  if (!value) return null;
  const asEmail = value.includes("@");

  if (hasDatabase()) {
    try {
      const user = asEmail
        ? await prisma.user.findUnique({
            where: { email: normalizeEmail(value) },
          })
        : await prisma.user.findFirst({
            where: { username: normalizeUsername(value) },
          });
      if (user) {
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
          passwordHash: user.password,
        };
      }
    } catch {
      // fall through to file store
    }
  }

  const file = await loadAccountsFile();
  const user = file.users.find((u) =>
    asEmail
      ? u.email === normalizeEmail(value)
      : u.username === normalizeUsername(value)
  );
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    image: null,
    role: user.role,
    phone: user.phone ?? null,
    passwordHash: user.passwordHash,
  };
}

export async function createAccount(input: {
  name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ user?: AuthUser; error?: string; status?: number }> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const name = input.name.trim();
  const phone = input.phone?.trim() || null;
  const passwordHash = await hashPassword(input.password);

  if (hasDatabase()) {
    try {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return { error: "Email already registered", status: 409 };
      }
      const existingUsername = await prisma.user.findFirst({
        where: { username },
      });
      if (existingUsername) {
        return { error: "Username already taken", status: 409 };
      }

      const user = await prisma.user.create({
        data: {
          name,
          username,
          email,
          phone,
          password: passwordHash,
          role: "CUSTOMER",
        },
      });
      await prisma.cart.create({ data: { userId: user.id } }).catch(() => null);

      return {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
        },
      };
    } catch {
      // DB configured but unavailable — fall through to file-backed accounts
    }
  }

  const file = await loadAccountsFile();
  if (file.users.some((u) => u.email === email)) {
    return { error: "Email already registered", status: 409 };
  }
  if (file.users.some((u) => u.username === username)) {
    return { error: "Username already taken", status: 409 };
  }

  const record: AccountRecord = {
    id: `usr_${randomBytes(8).toString("hex")}`,
    username,
    name,
    email,
    passwordHash,
    phone,
    role: "CUSTOMER",
    createdAt: new Date().toISOString(),
  };
  const next = { users: [...file.users, record] };
  const saved = await saveAccountsFile(
    next,
    `chore(accounts): register ${username}`
  );
  if (!saved.ok) {
    return {
      error: saved.error || "Could not save account",
      status: 503,
    };
  }

  return {
    user: {
      id: record.id,
      name: record.name,
      username: record.username,
      email: record.email,
      image: null,
      role: record.role,
      phone: record.phone ?? null,
    },
  };
}
