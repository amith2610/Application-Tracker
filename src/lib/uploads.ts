import path from "path";

/**
 * Base directory for app data (uploads, and in production the DB can sit alongside).
 * Defaults to process.cwd(); set DATA_DIR in production (e.g. /data) for persistent volume.
 */
export function getDataDir(): string {
  return process.env.DATA_DIR || process.cwd();
}

/**
 * Directory for uploaded documents (resumes, cover letters).
 * Use this in all document upload/download/delete routes.
 */
export function getUploadsDir(): string {
  return path.join(getDataDir(), "uploads");
}
