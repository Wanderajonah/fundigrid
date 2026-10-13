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
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserCached(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

module.exports = { protect, invalidateUserCache };
