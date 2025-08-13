import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { AuthService } from "@/services/authService";
import type { User, LoginCredentials } from "@/types/auth";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  const initAuth = () => {
    const savedToken = AuthService.getToken();
    const savedUser = AuthService.getUser();

    if (savedToken && savedUser) {
      token.value = savedToken;
      user.value = savedUser;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true;
    // Don't clear error immediately - let it persist until success

    try {
      const response = await AuthService.login(credentials);

      if (response.success && response.data) {
        user.value = response.data.user;
        token.value = response.data.token;

        // Save to localStorage
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        // Clear error only on success
        error.value = null;

        return { success: true };
      } else {
        throw new Error(response.error || "Login failed");
      }
    } catch (err: any) {
      // Set error and keep it visible
      error.value = err.message || "Login failed. Please try again.";
      return { success: false, error: err.message };
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async () => {
    isLoading.value = true;

    try {
      await AuthService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear state
      user.value = null;
      token.value = null;
      error.value = null;
      isLoading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    user,
    token,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    // Actions
    initAuth,
    login,
    logout,
    clearError,
  };
});
