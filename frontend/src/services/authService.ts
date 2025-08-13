import api from "./api";
import type { LoginCredentials, AuthResponse } from "@/types/auth";

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>("/auth/login", credentials);
      return response.data;
    } catch (error: any) {
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error(
          "Invalid email or password. Please check your credentials and try again."
        );
      } else if (error.response?.status === 400) {
        throw new Error("Please enter both email and password.");
      } else if (error.response?.status >= 500) {
        throw new Error("Server error. Please try again later.");
      } else if (error.code === "NETWORK_ERROR" || !error.response) {
        throw new Error(
          "Unable to connect to server. Please check your internet connection."
        );
      } else {
        throw new Error(
          error.response?.data?.error || "Login failed. Please try again."
        );
      }
    }
  }

  static async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
  }

  static isAuthenticated(): boolean {
    const token = localStorage.getItem("auth_token");
    return !!token;
  }

  static getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  static getUser(): any | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
}
