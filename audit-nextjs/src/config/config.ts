// lib/axios/config.ts

/**
 * Configuration helper for API requests
 */
export const dataConfig = () => {
  return {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
};

/**
 * Configuration for file upload
 */
export const fileConfig = () => {
  return {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
};

/**
 * Configuration with custom headers
 */
export const customConfig = (headers: Record<string, string> = {}) => {
  return {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...headers,
    },
  };
};