<!-- frontend/src/components/teacher/NotificationsModal.vue -->
<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    @click="$emit('close')"
  >
    <div
      class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <BellIcon class="h-6 w-6 text-gray-600 mr-3" />
          <h3 class="text-2xl font-bold text-gray-900">Notifications</h3>
          <span
            v-if="unreadCount > 0"
            class="ml-3 bg-red-500 text-white text-xs rounded-full px-2 py-1"
          >
            {{ unreadCount }} unread
          </span>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading Skeleton -->
        <div v-if="loading" class="space-y-3">
          <div
            v-for="i in 5"
            :key="`skeleton-${i}`"
            class="border rounded-lg p-4 animate-pulse"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center flex-1">
                <div class="w-6 h-6 bg-gray-300 rounded-full mr-3"></div>
                <div>
                  <div class="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                  <div class="h-3 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
              <div class="h-6 bg-gray-300 rounded w-20"></div>
            </div>
            <div class="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div class="h-3 bg-gray-300 rounded w-24"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="notifications.length === 0 && !loading"
          class="text-center py-12"
        >
          <BellIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 class="text-lg font-medium text-gray-500 mb-2">
            No notifications
          </h4>
          <p class="text-gray-400">
            You're all caught up! No new notifications for your advisory class.
          </p>
        </div>

        <!-- Notifications List -->
        <div v-else class="space-y-3">
          <div
            v-for="notification in notifications"
            :key="`notification-${notification.id}`"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{
              'border-blue-200 bg-blue-50': notification.status === 'UNREAD',
              'border-gray-200': notification.status === 'READ',
            }"
            @click="handleNotificationClick(notification)"
          >
            <!-- Notification Header -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center">
                <div class="flex-shrink-0 mr-3">
                  <component
                    :is="getNotificationIcon(notification.type)"
                    class="h-6 w-6"
                    :class="getNotificationIconClass(notification.type)"
                  />
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-900">
                    {{ notification.student_name }}
                  </h4>
                  <p class="text-xs text-gray-500">
                    ID: {{ notification.student_id }}
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="getTypeBadgeClass(notification.type)"
                >
                  {{ getTypeLabel(notification.type) }}
                </span>
                <span
                  v-if="notification.status === 'UNREAD'"
                  class="inline-flex w-2 h-2 bg-blue-500 rounded-full"
                ></span>
              </div>
            </div>

            <!-- Notification Message -->
            <p class="text-sm text-gray-700 mb-3">
              {{ notification.message }}
            </p>

            <!-- Metadata -->
            <div
              v-if="notification.metadata"
              class="text-xs text-gray-500 mb-3"
            >
              <div
                v-if="notification.metadata.total_late_minutes"
                class="inline-flex items-center mr-4"
              >
                <ExclamationTriangleIcon class="h-3 w-3 mr-1" />
                {{ notification.metadata.total_late_minutes }} total late
                minutes
              </div>
              <div
                v-if="notification.metadata.consecutive_days"
                class="inline-flex items-center"
              >
                <CalendarDaysIcon class="h-3 w-3 mr-1" />
                {{ notification.metadata.consecutive_days }} consecutive days
              </div>
            </div>

            <!-- Timestamp -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">
                {{ formatTimestamp(notification.sent_at) }}
              </span>
              <button
                v-if="notification.status === 'UNREAD'"
                @click.stop="markAsRead(notification)"
                class="text-xs text-blue-600 hover:text-blue-800 font-medium"
                :disabled="markingAsRead === notification.id"
              >
                {{
                  markingAsRead === notification.id
                    ? "Marking..."
                    : "Mark as read"
                }}
              </button>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMorePages && !loading" class="mt-4 text-center">
          <button
            @click="loadMoreNotifications"
            :disabled="loadingMore"
            class="btn-secondary"
          >
            {{ loadingMore ? "Loading..." : "Load More" }}
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 pt-4 border-t flex justify-between items-center">
        <button
          v-if="unreadCount > 0"
          @click="markAllAsRead"
          class="text-sm text-blue-600 hover:text-blue-800 font-medium"
          :disabled="markingAsRead > 0"
        >
          {{ markingAsRead > 0 ? "Processing..." : "Mark all as read" }}
        </button>
        <div class="flex space-x-3">
          <button @click="$emit('close')" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  XMarkIcon,
  BellIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserMinusIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/24/outline";
import { useDashboardApi } from "@/composables/useDashboardApi";
import type { TeacherNotification } from "@/types/dashboard";

// Emits
interface Emits {
  close: [];
  markRead: [notificationId: number];
  markAllRead: [];
}

const emit = defineEmits<Emits>();

// Composables
const { getTeacherNotificationsPaginated, markNotificationAsRead } =
  useDashboardApi();

// Reactive state
const notifications = ref<TeacherNotification[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const markingAsRead = ref(0);
const currentPage = ref(1);
const totalPages = ref(0);
const hasMorePages = computed(() => currentPage.value < totalPages.value);

// Computed
const unreadCount = computed(() => {
  return notifications.value.filter((n) => n.status === "UNREAD").length;
});

// Methods
const loadNotifications = async (page: number = 1, append: boolean = false) => {
  try {
    if (page === 1) {
      loading.value = true;
    } else {
      loadingMore.value = true;
    }

    const response = await getTeacherNotificationsPaginated(page, 10);

    if (response.success && response.data) {
      if (append) {
        notifications.value.push(...response.data.notifications);
      } else {
        notifications.value = response.data.notifications;
      }

      currentPage.value = response.data.pagination.current_page;
      totalPages.value = response.data.pagination.total_pages;
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMoreNotifications = async () => {
  if (hasMorePages.value && !loadingMore.value) {
    await loadNotifications(currentPage.value + 1, true);
  }
};

const handleNotificationClick = (notification: TeacherNotification) => {
  if (notification.status === "UNREAD") {
    markAsRead(notification);
  }
};

const markAsRead = async (notification: TeacherNotification) => {
  if (markingAsRead.value === notification.id) return;

  markingAsRead.value = notification.id;
  try {
    const response = await markNotificationAsRead(notification.id);
    if (response.success) {
      // Update local state
      const index = notifications.value.findIndex(
        (n) => n.id === notification.id
      );
      if (index !== -1) {
        notifications.value[index].status = "READ";
      }
      emit("markRead", notification.id);
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  } finally {
    setTimeout(() => {
      markingAsRead.value = 0;
    }, 500);
  }
};

const markAllAsRead = async () => {
  if (markingAsRead.value > 0) return;

  markingAsRead.value = -1;
  try {
    emit("markAllRead");
    // Update local state
    notifications.value.forEach((notification) => {
      if (notification.status === "UNREAD") {
        notification.status = "READ";
      }
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  } finally {
    setTimeout(() => {
      markingAsRead.value = 0;
    }, 500);
  }
};

// Icon and styling methods (keep your existing ones)
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "EXCEEDED_70_MINUTES":
      return ExclamationTriangleIcon;
    case "CONSECUTIVE_ABSENCE":
      return UserMinusIcon;
    default:
      return ExclamationCircleIcon;
  }
};

const getNotificationIconClass = (type: string) => {
  switch (type) {
    case "EXCEEDED_70_MINUTES":
      return "text-red-500";
    case "CONSECUTIVE_ABSENCE":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
};

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case "EXCEEDED_70_MINUTES":
      return "bg-red-100 text-red-800";
    case "CONSECUTIVE_ABSENCE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "EXCEEDED_70_MINUTES":
      return "70 Min Exceeded";
    case "CONSECUTIVE_ABSENCE":
      return "Consecutive Absence";
    default:
      return "Notification";
  }
};

const formatTimestamp = (timestamp: Date | string) => {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
};

// Load notifications on mount
onMounted(() => {
  loadNotifications();
});
</script>
