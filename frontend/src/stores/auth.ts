import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { AuthService } from "@/services/authService";
import type { User, LoginCredentials } from "@/types/auth";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.type === "Admin");
  const isTeacher = computed(() => user.value?.type === "Teacher");
  const isStaff = computed(() => user.value?.type === "Staff");

  // Get display name based on user type
  const userDisplayName = computed(() => {
    if (!user.value) return "User";

    if (
      user.value.type === "Teacher" &&
      user.value.first_name &&
      user.value.last_name
    ) {
      return `${user.value.first_name} ${user.value.last_name}`;
    } else if (
      (user.value.type === "Admin" || user.value.type === "Staff") &&
      user.value.name
    ) {
      return user.value.name;
    }

    return user.value.email;
  });

  // Actions
  const initAuth = () => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        token.value = savedToken;
        user.value = JSON.parse(savedUser);
      } catch (error) {
        // Invalid saved data, clear it
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    }
  };

  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await AuthService.login(credentials);

      if (response.success && response.data) {
        user.value = response.data.user;
        token.value = response.data.token;

        // Save to localStorage
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        return { success: true };
      } else {
        throw new Error(response.error || "Login failed");
      }
    } catch (err: any) {
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
      // Clear state regardless of API call success
      user.value = null;
      token.value = null;
      error.value = null;
      isLoading.value = false;

      // Clear localStorage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
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
    isAdmin,
    isTeacher,
    isStaff,
    userDisplayName,
    // Actions
    initAuth,
    login,
    logout,
    clearError,
  };
});
