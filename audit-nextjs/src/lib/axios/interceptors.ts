// lib/axios/interceptors.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { signOut } from "next-auth/react";
import { getSession } from "next-auth/react";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  withCredentials: true,
});

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const session = await getSession();

      if (session?.user?.access_token) {
        config.headers.Authorization = `Bearer ${session.user.access_token}`;
      }

      // Log request (development only)
      if (process.env.NODE_ENV === "development") {
        console.log("Request:", {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data,
          headers: config.headers,
        });
      }

      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  },
  (error: AxiosError) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log("Response:", {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }

    // Handle unauthorized: true in response body (user not registered in system)
    if (response.data?.unauthorized === true) {
      console.warn("Unauthorized user - redirecting to unauthorized page");
      if (typeof window !== "undefined") {
        window.location.href = "/unauthorized";
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    //  Log error
    console.error("API Error:", {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data,
    });

    //  Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      // User is authenticated but not registered in the system
      if (data?.unauthorized === true) {
        console.warn("User not registered in system - redirecting to unauthorized page");
        if (typeof window !== "undefined") {
          window.location.href = "/unauthorized";
        }
        return Promise.reject(error);
      }
      // Normal session expired → sign out
      console.warn("Unauthorized - Logging out...");
      await signOut({
        redirect: false,
        callbackUrl: "/login?error=SessionExpired",
      });
    }

    //  Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.warn("Forbidden - No permission");
    }

    //  Handle 404 Not Found
    if (error.response?.status === 404) {
      console.warn(" Not found");
    }

    //  Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("Server error");
    }

    //  Handle Network Error
    if (error.code === "ECONNREFUSED" || error.code === "ERR_NETWORK") {
      console.error("Network error");
    }

    //  Handle Timeout
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
    }

    return Promise.reject(error);
  }
);

export default client;