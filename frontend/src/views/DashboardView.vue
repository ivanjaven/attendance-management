<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ isAdmin ? "Admin Dashboard" : "Dashboard" }}
            </h1>
            <p class="text-gray-600">Welcome back, {{ userDisplayName }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="getRoleBadgeClass()"
            >
              {{ user?.type }}
            </span>
            <button
              @click="handleLogout"
              :disabled="isLoading"
              class="btn-secondary"
            >
              {{ isLoading ? "Logging out..." : "Logout" }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
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
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">QR Scanner</h3>
            <p class="text-gray-600 mb-6">
              Scan student QR codes to log attendance
            </p>
            <router-link to="/qr-scanner" class="btn-primary">
              <QrCodeIcon class="h-5 w-5 mr-2 inline" />
              Start QR Scanner
            </router-link>
          </div>

          <!-- Only show for Teachers -->
          <div v-if="isTeacher" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              My Advisory Class
            </h3>
            <p class="text-gray-600 mb-6">
              View attendance and manage your advisory students
            </p>
            <button class="btn-secondary">
              <UsersIcon class="h-5 w-5 mr-2 inline" />
              View My Class
            </button>
          </div>

          <!-- Only show for Staff -->
          <div v-if="isStaff" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              Gate Operations
            </h3>
            <p class="text-gray-600 mb-6">
              Monitor student entry and exit activities
            </p>
            <button class="btn-secondary">
              <ClockIcon class="h-5 w-5 mr-2 inline" />
              View Activities
            </button>
          </div>
        </div>

        <!-- Admin-only QR Generator Section -->
        <div v-if="isAdmin" class="mb-8">
          <div class="card">
            <div class="flex items-center mb-6">
              <div
                class="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg"
              >
                <QrCodeIcon class="h-6 w-6 text-primary-600" />
              </div>
              <div class="ml-4">
                <h3 class="text-xl font-semibold text-gray-900">
                  QR Code Generator
                </h3>
                <p class="text-gray-600">
                  Generate and manage student ID QR codes
                </p>
              </div>
            </div>
            <QRGenerator />
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
import QRGenerator from "@/components/admin/QRGenerator.vue";
import { QrCodeIcon, UsersIcon, ClockIcon } from "@heroicons/vue/24/outline";

const router = useRouter();
const authStore = useAuthStore();

// Computed
const user = computed(() => authStore.user);
const isLoading = computed(() => authStore.isLoading);
const isAdmin = computed(() => authStore.isAdmin);
const isTeacher = computed(() => authStore.isTeacher);
const isStaff = computed(() => authStore.isStaff);
const userDisplayName = computed(() => authStore.userDisplayName);

// Methods
const getRoleBadgeClass = () => {
  const type = user.value?.type;
  switch (type) {
    case "Admin":
      return "bg-red-100 text-red-800";
    case "Teacher":
      return "bg-blue-100 text-blue-800";
    case "Staff":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push("/login");
  } catch (error) {
    console.error("Logout error:", error);
    router.push("/login");
  }
};
</script>
