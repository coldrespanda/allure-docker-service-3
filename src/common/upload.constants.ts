export const UPLOAD_LIMITS = {
  FILES: {
    MAX_SIZE: parseInt(process.env.MAX_UPLOAD_FILES_SIZE || '52428800', 10),
    MAX_COUNT: parseInt(process.env.MAX_UPLOAD_FILES_COUNT || '500', 10),
  },
  ZIP: {
    MAX_SIZE: parseInt(process.env.MAX_UPLOAD_ZIP_SIZE || '104857600', 10),
  },
  JSON: {
    MAX_SIZE: parseInt(process.env.MAX_JSON_SIZE || '209715200', 10),
  },
};
