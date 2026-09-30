const { getSupabase } = require("../config/supabase");

const streamGridFsFile = (req, res, next) => {
  // Legacy: files may live on disk as fallback
  next();
};

const ensureStorageBuckets = async () => {
  // Supabase Storage buckets are created via dashboard or migrations.
  // This is a no-op in the shim.
};

module.exports = { streamGridFsFile, ensureStorageBuckets };
