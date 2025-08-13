<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with logout -->
    <header class="bg-white shadow-soft border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-4">
            <div class="logo-circle !w-10 !h-10 !mb-0">
              <div class="logo-inner !w-4 !h-4"></div>
            </div>
            <h1 class="text-xl font-semibold text-gray-900">
              Attendance System
            </h1>
          </div>

          <div class="flex items-center space-x-4">
            <!-- User info -->
            <div v-if="user" class="text-sm text-gray-600">
              Welcome, {{ user.first_name || user.email }}
            </div>

            <!-- Logout button -->
            <button
              @click="handleLogout"
              :disabled="isLoading"
              class="btn-outline text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 focus:ring-red-500"
              :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
            >
              <svg
                v-if="isLoading"
                class="animate-spin h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ isLoading ? "Logging out..." : "Logout" }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p class="text-gray-600">Manage your attendance system</p>
        </div>

        <!-- Dashboard Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <!-- Quick Stats -->
          <div class="card-compact">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              Today's Attendance
            </h3>
            <p class="text-3xl font-bold text-primary-600">0</p>
            <p class="text-sm text-gray-500">Students scanned in</p>
          </div>

          <div class="card-compact">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              Late Students
            </h3>
            <p class="text-3xl font-bold text-orange-600">0</p>
            <p class="text-sm text-gray-500">Students late today</p>
          </div>

          <div class="card-compact">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              Total Students
            </h3>
            <p class="text-3xl font-bold text-secondary-600">0</p>
            <p class="text-sm text-gray-500">Registered students</p>
          </div>
        </div>

        <!-- Action Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">QR Scanner</h3>
            <p class="text-gray-600 mb-6">
              Scan student QR codes to log attendance
            </p>
            <button class="btn-primary">Start QR Scanner</button>
          </div>

          <div class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              Attendance Reports
            </h3>
            <p class="text-gray-600 mb-6">
              View detailed attendance analytics and reports
            </p>
            <button class="btn-secondary">View Reports</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

// Computed
const user = computed(() => authStore.user);
const isLoading = computed(() => authStore.isLoading);

// Methods
const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push("/login");
  } catch (error) {
    console.error("Logout error:", error);
    // Force logout even if API call fails
    router.push("/login");
  }
};
</script>
