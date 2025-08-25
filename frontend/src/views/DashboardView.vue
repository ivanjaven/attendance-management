<!-- frontend/src/views/DashboardView.vue -->
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
            <!-- Notifications badge for teachers -->
            <div v-if="isTeacher" class="relative">
              <button
                @click="showNotificationsModal = true"
                class="p-2 text-gray-600 hover:text-gray-900 relative"
                :class="{ 'animate-pulse': loadingNotificationCount }"
              >
                <BellIcon class="h-6 w-6" />
                <span
                  v-if="unreadNotificationsCount > 0"
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse"
                >
                  {{
                    unreadNotificationsCount > 99
                      ? "99+"
                      : unreadNotificationsCount
                  }}
                </span>
                <span
                  v-else-if="loadingNotificationCount"
                  class="absolute -top-1 -right-1 bg-gray-400 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <div
                    class="animate-spin rounded-full h-3 w-3 border-b border-white"
                  ></div>
                </span>
              </button>
            </div>
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
          <!-- Admin & Staff Summary Cards (Shared Real Data) -->
          <template v-if="isAdmin || isStaff">
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Today's Attendance
              </h3>
              <p
                v-if="!loadingAttendanceStats"
                class="text-3xl font-bold text-primary-600"
              >
                {{ schoolAttendanceStats?.present_today ?? 0 }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
              <p class="text-sm text-gray-500">Students present</p>
            </div>

            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Late Students
              </h3>
              <p
                v-if="!loadingAttendanceStats"
                class="text-3xl font-bold text-orange-600"
              >
                {{ schoolAttendanceStats?.late_today ?? 0 }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
              <p class="text-sm text-gray-500">Late arrivals</p>
            </div>

            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Absent Students
              </h3>
              <p
                v-if="!loadingAttendanceStats"
                class="text-3xl font-bold text-red-600"
              >
                {{ schoolAttendanceStats?.absent_today ?? 0 }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
              <p class="text-sm text-gray-500">Not present</p>
            </div>
          </template>

          <!-- Teacher Summary Cards (Real Data from API) -->
          <template v-if="isTeacher">
            <!-- Present Students Card -->
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Present Today
              </h3>
              <p
                v-if="!loadingSummary"
                class="text-3xl font-bold text-primary-600"
              >
                {{ teacherSummary?.present_today ?? 0 }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
              <p class="text-sm text-gray-500">
                out of {{ teacherSummary?.total_students ?? 0 }}
              </p>
            </div>

            <!-- Absent Students Card -->
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Absent Today
              </h3>
              <p class="text-3xl font-bold text-red-600">
                {{ teacherSummary?.absent_today ?? 0 }}
              </p>
              <p class="text-sm text-gray-500">Students absent</p>
            </div>

            <!-- Late Students Card -->
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Late Today
              </h3>
              <p class="text-3xl font-bold text-orange-600">
                {{ teacherSummary?.late_today ?? 0 }}
              </p>
              <p class="text-sm text-gray-500">Students late</p>
            </div>

            <!-- Total Students Card -->
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Total Students
              </h3>
              <p class="text-3xl font-bold text-gray-800">
                {{ teacherSummary?.total_students ?? 0 }}
              </p>
              <p class="text-sm text-gray-500">In advisory class</p>
            </div>

            <!-- Attendance Percentage Card -->
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Attendance Rate
              </h3>
              <p class="text-3xl font-bold text-primary-600">
                {{ (teacherSummary?.attendance_percentage ?? 0).toFixed(1) }}%
              </p>
              <p class="text-sm text-gray-500">Today's attendance</p>
            </div>

            <!-- Advisory Class Info -->
            <div class="card-compact md:col-span-2">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Advisory Class
              </h3>
              <p class="text-xl font-medium text-gray-800">
                {{
                  teacherSummary?.advisory_class ?? "No Advisory Class Assigned"
                }}
              </p>
              <p class="text-sm text-gray-500">Your assigned advisory class</p>
            </div>
          </template>
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

          <!-- Teacher: Advisory Class Management -->
          <div v-if="isTeacher" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              Advisory Class
            </h3>
            <p class="text-gray-600 mb-6">
              Manage your advisory class attendance records
            </p>
            <router-link to="/advisory-class" class="btn-primary">
              <UsersIcon class="h-5 w-5 mr-2 inline" />
              View Advisory Class
            </router-link>
          </div>

          <!-- Admin: School Start Time Management -->
          <div v-if="isAdmin" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              School Start Time
            </h3>
            <p class="text-gray-600 mb-6">
              Manage school start time for current quarter
            </p>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Current Quarter:
                  {{ quarterInfo?.quarter_name || "Loading..." }}
                </label>
                <div class="flex items-center space-x-3">
                  <div class="flex-1">
                    <input
                      v-model="schoolStartTimeInput"
                      type="time"
                      class="form-input"
                      :disabled="updatingStartTime"
                    />
                  </div>
                  <button
                    @click="updateStartTime"
                    :disabled="updatingStartTime || !schoolStartTimeInput"
                    class="btn-secondary"
                  >
                    <ClockIcon class="h-5 w-5 mr-2 inline" />
                    {{ updatingStartTime ? "Updating..." : "Update" }}
                  </button>
                </div>
              </div>

              <!-- Success/Error Messages -->
              <div
                v-if="startTimeUpdateMessage"
                class="p-3 rounded-md"
                :class="
                  startTimeUpdateMessage.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                "
              >
                {{ startTimeUpdateMessage.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Notifications Modal -->
    <NotificationsModal
      v-if="showNotificationsModal"
      @close="showNotificationsModal = false"
      @mark-read="handleMarkNotificationRead"
      @mark-all-read="handleMarkAllNotificationsRead"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import NotificationsModal from "@/components/teacher/NotificationsModal.vue";
import SkeletonLoader from "@/components/common/SkeletonLoader.vue";
import {
  QrCodeIcon,
  UsersIcon,
  ClockIcon,
  BellIcon,
} from "@heroicons/vue/24/outline";
import { useDashboardApi } from "@/composables/useDashboardApi";
import type { TeacherSummary, SchoolAttendanceStats } from "@/types/dashboard";

const router = useRouter();
const authStore = useAuthStore();
const {
  getTeacherSummary,
  getTeacherNotificationCount,
  markNotificationAsRead: markNotificationRead,
  markAllNotificationsAsRead,
  getSchoolAttendanceStats,
  updateSchoolStartTime,
  getCurrentQuarterInfo,
} = useDashboardApi();

// Reactive state
const teacherSummary = ref<TeacherSummary | null>(null);
const schoolAttendanceStats = ref<SchoolAttendanceStats | null>(null);
const quarterInfo = ref<any>(null);
const notificationCount = ref(0);

// Loading states
const loadingSummary = ref(false);
const loadingAttendanceStats = ref(false);
const loadingNotificationCount = ref(false);
const showNotificationsModal = ref(false);

// School start time functionality
const schoolStartTimeInput = ref("");
const updatingStartTime = ref(false);
const startTimeUpdateMessage = ref<{
  type: "success" | "error";
  text: string;
} | null>(null);

// Computed properties
const user = computed(() => authStore.user);
const isLoading = computed(() => authStore.isLoading);
const isAdmin = computed(() => authStore.isAdmin);
const isTeacher = computed(() => authStore.isTeacher);
const isStaff = computed(() => authStore.isStaff);
const userDisplayName = computed(() => authStore.userDisplayName);

const unreadNotificationsCount = computed(() => notificationCount.value);

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

// Notification methods
const loadNotificationCount = async () => {
  if (!isTeacher.value) return;

  loadingNotificationCount.value = true;
  try {
    const response = await getTeacherNotificationCount();
    if (response.success && response.data) {
      notificationCount.value = response.data.count;
    }
  } catch (error) {
    console.error("Error loading notification count:", error);
  } finally {
    loadingNotificationCount.value = false;
  }
};

const handleMarkNotificationRead = async (notificationId: number) => {
  try {
    const response = await markNotificationRead(notificationId);
    if (response.success) {
      // Decrease notification count
      notificationCount.value = Math.max(0, notificationCount.value - 1);
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

const handleMarkAllNotificationsRead = async () => {
  try {
    const response = await markAllNotificationsAsRead();
    if (response.success) {
      notificationCount.value = 0;
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
};

// Data loading methods
const loadTeacherData = async () => {
  if (!isTeacher.value) return;

  loadingSummary.value = true;
  try {
    // Load teacher summary
    const summaryResponse = await getTeacherSummary();
    if (summaryResponse.success && summaryResponse.data) {
      teacherSummary.value = summaryResponse.data;
    }

    // Load notification count (quick load)
    await loadNotificationCount();
  } catch (error) {
    console.error("Error loading teacher data:", error);
  } finally {
    loadingSummary.value = false;
  }
};

const loadSchoolData = async () => {
  if (!isAdmin.value && !isStaff.value) return;

  loadingAttendanceStats.value = true;
  try {
    // Load school attendance stats (available for both Admin and Staff)
    const statsResponse = await getSchoolAttendanceStats();
    if (statsResponse.success && statsResponse.data) {
      schoolAttendanceStats.value = statsResponse.data;
    }

    // Load quarter info (Admin only)
    if (isAdmin.value) {
      const quarterResponse = await getCurrentQuarterInfo();
      if (quarterResponse.success && quarterResponse.data) {
        quarterInfo.value = quarterResponse.data;
        // Set current school start time in input
        schoolStartTimeInput.value = quarterResponse.data.school_start_time;
      }
    }
  } catch (error) {
    console.error("Error loading school data:", error);
  } finally {
    loadingAttendanceStats.value = false;
  }
};

// Admin functionality
const updateStartTime = async () => {
  if (!schoolStartTimeInput.value) return;

  updatingStartTime.value = true;
  startTimeUpdateMessage.value = null;

  try {
    // Ensure proper HH:MM:SS format with validation
    let timeWithSeconds = schoolStartTimeInput.value.trim();

    // Check if it's already in HH:MM:SS format or just HH:MM
    const timeParts = timeWithSeconds.split(":");
    if (timeParts.length === 2) {
      timeWithSeconds = timeWithSeconds + ":00";
    } else if (timeParts.length !== 3) {
      throw new Error("Invalid time format");
    }

    // Validate the final format before sending
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(timeWithSeconds)) {
      throw new Error("Invalid time format. Please use valid time (HH:MM)");
    }

    console.log("Sending time format:", timeWithSeconds); // Debug log

    const response = await updateSchoolStartTime(timeWithSeconds);

    if (response.success) {
      startTimeUpdateMessage.value = {
        type: "success",
        text: "School start time updated successfully!",
      };

      await loadSchoolData();
    } else {
      startTimeUpdateMessage.value = {
        type: "error",
        text: response.error || "Failed to update school start time",
      };
    }
  } catch (error: any) {
    console.error("Error updating school start time:", error);
    startTimeUpdateMessage.value = {
      type: "error",
      text: error.message || "An unexpected error occurred",
    };
  } finally {
    updatingStartTime.value = false;

    // Clear message after 3 seconds
    setTimeout(() => {
      startTimeUpdateMessage.value = null;
    }, 3000);
  }
};
// Lifecycle
onMounted(async () => {
  if (isTeacher.value) {
    await loadTeacherData();
  } else if (isAdmin.value || isStaff.value) {
    await loadSchoolData();
  }
});
</script>
