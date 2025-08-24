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
            <div
              v-if="isTeacher && unreadNotificationsCount > 0"
              class="relative"
            >
              <button
                @click="showNotificationsModal = true"
                class="p-2 text-gray-600 hover:text-gray-900 relative"
              >
                <BellIcon class="h-6 w-6" />
                <span
                  class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {{ unreadNotificationsCount }}
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
              <p class="text-sm text-gray-500">Students late today</p>
            </div>

            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Total Students
              </h3>
              <p
                v-if="!loadingAttendanceStats"
                class="text-3xl font-bold text-secondary-600"
              >
                {{ schoolAttendanceStats?.total_students ?? 0 }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
              <p class="text-sm text-gray-500">Registered students</p>
            </div>
          </template>

          <!-- Teacher Summary Cards -->
          <template v-if="isTeacher">
            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Present Today
              </h3>
              <p class="text-3xl font-bold text-green-600">
                {{ teacherSummary?.present_today ?? 0 }}
              </p>
              <p class="text-sm text-gray-500">Students present</p>
            </div>

            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Late Students
              </h3>
              <p class="text-3xl font-bold text-orange-600">
                {{ teacherSummary?.late_today ?? 0 }}
              </p>
              <p class="text-sm text-gray-500">Students late today</p>
            </div>

            <div class="card-compact">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Total Students
              </h3>
              <p class="text-3xl font-bold text-blue-600">
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
                    {{ updatingStartTime ? "Updating..." : "Update Time" }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">
                  Current:
                  {{ formatTime(quarterInfo?.school_start_time) || "Not set" }}
                </p>

                <div
                  v-if="startTimeUpdateMessage"
                  class="mt-3 rounded-lg p-3 text-sm"
                  :class="
                    startTimeUpdateMessage.type === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  "
                >
                  {{ startTimeUpdateMessage.text }}
                </div>
              </div>
            </div>
          </div>

          <!-- Teacher: My Advisory Class -->
          <div v-if="isTeacher" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              My Advisory Class
            </h3>
            <p class="text-gray-600 mb-6">
              View attendance and manage your advisory students
            </p>
            <router-link to="/advisory-class" class="btn-secondary">
              <UsersIcon class="h-5 w-5 mr-2 inline" />
              View My Class
            </router-link>
          </div>

          <!-- Staff: School Overview -->
          <div v-if="isStaff" class="card">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              School Overview
            </h3>
            <p class="text-gray-600 mb-6">
              View today's attendance overview and statistics
            </p>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Attendance Rate</span>
                <span
                  v-if="!loadingAttendanceStats"
                  class="font-semibold text-primary-600"
                >
                  {{
                    (
                      ((schoolAttendanceStats?.present_today ?? 0) /
                        Math.max(
                          schoolAttendanceStats?.total_students ?? 1,
                          1
                        )) *
                      100
                    ).toFixed(1)
                  }}%
                </span>
                <SkeletonLoader v-else width="3rem" height="1rem" />
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Absent Today</span>
                <span
                  v-if="!loadingAttendanceStats"
                  class="font-semibold text-red-600"
                >
                  {{ schoolAttendanceStats?.absent_today ?? 0 }}
                </span>
                <SkeletonLoader v-else width="2rem" height="1rem" />
              </div>
              <div class="text-xs text-gray-500 pt-2 border-t">
                Real-time attendance monitoring
              </div>
            </div>
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

    <!-- Notifications Modal -->
    <NotificationsModal
      v-if="showNotificationsModal"
      :notifications="notifications"
      @close="showNotificationsModal = false"
      @mark-read="markNotificationAsRead"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import QRGenerator from "@/components/admin/QRGenerator.vue";
import NotificationsModal from "@/components/teacher/NotificationsModal.vue";
import SkeletonLoader from "@/components/common/SkeletonLoader.vue";
import {
  QrCodeIcon,
  UsersIcon,
  ClockIcon,
  BellIcon,
} from "@heroicons/vue/24/outline";
import { useDashboardApi } from "@/composables/useDashboardApi";
import type {
  TeacherSummary,
  TeacherNotification,
  SchoolAttendanceStats,
} from "@/composables/useDashboardApi";

const router = useRouter();
const authStore = useAuthStore();
const {
  getTeacherSummary,
  getTeacherNotifications,
  markNotificationAsRead: markNotificationRead,
  getSchoolAttendanceStats,
  updateSchoolStartTime,
  getCurrentQuarterInfo,
} = useDashboardApi();

const teacherSummary = ref<TeacherSummary | null>(null);
const notifications = ref<TeacherNotification[]>([]);
const schoolAttendanceStats = ref<SchoolAttendanceStats | null>(null);
const quarterInfo = ref<any>(null);
const loadingSummary = ref(false);
const loadingAttendanceStats = ref(false);
const showNotificationsModal = ref(false);

// School start time functionality
const schoolStartTimeInput = ref("");
const updatingStartTime = ref(false);
const startTimeUpdateMessage = ref<{
  type: "success" | "error";
  text: string;
} | null>(null);

const user = computed(() => authStore.user);
const isLoading = computed(() => authStore.isLoading);
const isAdmin = computed(() => authStore.isAdmin);
const isTeacher = computed(() => authStore.isTeacher);
const isStaff = computed(() => authStore.isStaff);
const userDisplayName = computed(() => authStore.userDisplayName);

const unreadNotificationsCount = computed(() => {
  return notifications.value.filter((n) => n.status === "UNREAD").length;
});

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

const loadTeacherData = async () => {
  if (!isTeacher.value) return;

  loadingSummary.value = true;
  try {
    // Load teacher summary
    const summaryResponse = await getTeacherSummary();
    if (summaryResponse.success && summaryResponse.data) {
      teacherSummary.value = summaryResponse.data;
    }

    // Load notifications
    const notificationsResponse = await getTeacherNotifications();
    if (notificationsResponse.success && notificationsResponse.data) {
      notifications.value = notificationsResponse.data;
    }
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
    const attendanceResponse = await getSchoolAttendanceStats();
    if (attendanceResponse.success && attendanceResponse.data) {
      schoolAttendanceStats.value = attendanceResponse.data;
    }

    // Load quarter info (Admin only)
    if (isAdmin.value) {
      const quarterResponse = await getCurrentQuarterInfo();
      if (quarterResponse.success && quarterResponse.data) {
        quarterInfo.value = quarterResponse.data;
        if (quarterResponse.data.school_start_time) {
          schoolStartTimeInput.value =
            quarterResponse.data.school_start_time.substring(0, 5); // Remove seconds
        }
      }
    }
  } catch (error) {
    console.error("Error loading school data:", error);
  } finally {
    loadingAttendanceStats.value = false;
  }
};

const markNotificationAsRead = async (notificationId: number) => {
  try {
    const response = await markNotificationRead(notificationId);
    if (response.success) {
      // Update the notification status locally
      const notification = notifications.value.find(
        (n) => n.id === notificationId
      );
      if (notification) {
        notification.status = "READ";
      }
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

const formatTime = (time: string | null): string => {
  if (!time) return "Not set";

  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = time.split(":");
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";

  return `${hour12}:${minutes} ${ampm}`;
};

const updateStartTime = async () => {
  if (!schoolStartTimeInput.value) return;

  updatingStartTime.value = true;
  startTimeUpdateMessage.value = null;

  try {
    // Convert time input to HH:MM:SS format
    const timeWithSeconds = schoolStartTimeInput.value + ":00";

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
  } catch (error) {
    console.error("Error updating school start time:", error);
    startTimeUpdateMessage.value = {
      type: "error",
      text: "An unexpected error occurred",
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
onMounted(() => {
  if (isTeacher.value) {
    loadTeacherData();
  }

  if (isAdmin.value || isStaff.value) {
    loadSchoolData();
  }
});
</script>
