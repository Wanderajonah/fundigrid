const jwt = require("jsonwebtoken");
const User = require("../models/User");

// `protect` re-reads the signed-in user on every request — one Supabase
// round-trip per API call, multiplied by the admin console's parallel
// fetches. A short in-memory cache removes that; routes that change a user
// (status, password, delete) drop the entry via invalidateUserCache.
const CACHE_TTL_MS = 60 * 1000;
const userCache = new Map();

function invalidateUserCache(id) {
  if (id) userCache.delete(String(id));
}

async function findUserCached(id) {
  const key = String(id);
  const hit = userCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  const user = await User.findById(id);
  if (user) userCache.set(key, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  else userCache.delete(key);
  return user;
}

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, code: "NO_TOKEN", message: "Not authorized, no token" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const expired = error && error.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      code: expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      message: expired ? "Your session has expired. Please sign in again." : "Not authorized",
    });
  }

  try {
    const user = await findUserCached(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, code: "USER_NOT_FOUND", message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    // A database hiccup is not an auth failure — let the error handler return
    // a 500 instead of telling the user their session is invalid.
    next(error);
  }
};

module.exports = { protect, invalidateUserCache };
