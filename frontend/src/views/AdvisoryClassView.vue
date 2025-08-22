<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-6">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.go(-1)"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon class="h-5 w-5" />
            </button>
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                My Advisory Class
              </h1>
              <p class="text-gray-600">
                {{ teacherSummary?.advisory_class || "Loading..." }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <p class="text-lg font-semibold text-gray-900">
                {{ totalPresent }}/{{ totalStudents }}
              </p>
              <p class="text-sm text-gray-600">Present Today</p>
            </div>
            <div
              class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"
            >
              <UsersIcon class="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Stats Cards -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Stats Cards with Skeleton Loading -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <!-- Present Card -->
        <div class="card-compact">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"
              >
                <CheckCircleIcon class="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Present Today</p>
              <p
                v-if="!summaryLoading"
                class="text-2xl font-bold text-gray-900"
              >
                {{ totalPresent }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
            </div>
          </div>
        </div>

        <!-- Late Card -->
        <div class="card-compact">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"
              >
                <ClockIcon class="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Late Today</p>
              <p
                v-if="!summaryLoading"
                class="text-2xl font-bold text-gray-900"
              >
                {{ totalLate }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
            </div>
          </div>
        </div>

        <!-- Absent Card -->
        <div class="card-compact">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"
              >
                <XCircleIcon class="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Absent Today</p>
              <p
                v-if="!summaryLoading"
                class="text-2xl font-bold text-gray-900"
              >
                {{ totalAbsent }}
              </p>
              <SkeletonLoader v-else width="3rem" height="2rem" class="mt-1" />
            </div>
          </div>
        </div>

        <!-- Attendance Rate Card -->
        <div class="card-compact">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"
              >
                <ChartBarIcon class="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p
                v-if="!summaryLoading"
                class="text-2xl font-bold text-gray-900"
              >
                {{ attendanceRate }}%
              </p>
              <SkeletonLoader v-else width="4rem" height="2rem" class="mt-1" />
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Records Table -->
      <div class="card">
        <!-- Table Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                Attendance Records
              </h2>
              <p class="text-gray-600">View and manage student attendance</p>
            </div>
            <div class="flex items-center space-x-3">
              <!-- Search -->
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search students..."
                  class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                  @input="debouncedSearch"
                />
                <MagnifyingGlassIcon
                  class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                />
              </div>
              <!-- Date Filter -->
              <select
                v-model="selectedPeriod"
                @change="handlePeriodChange"
                class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Date Range</option>
              </select>
            </div>
          </div>

          <!-- Custom Date Range -->
          <div
            v-if="selectedPeriod === 'custom'"
            class="mt-4 flex items-center space-x-4"
          >
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >From</label
              >
              <input
                v-model="customDateFrom"
                type="date"
                class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @change="loadStudentRecords"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >To</label
              >
              <input
                v-model="customDateTo"
                type="date"
                class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                @change="loadStudentRecords"
              />
            </div>
          </div>
        </div>

        <!-- Table Content -->
        <div class="overflow-x-auto">
          <!-- Skeleton Loading Table -->
          <TableSkeleton
            v-if="loading"
            :headers="[
              'Student',
              'Date',
              'Time In',
              'Time Out',
              'Status',
              'Late Minutes',
            ]"
            :rows="10"
          />

          <!-- Actual Table -->
          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Student
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Time In
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Time Out
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Late Minutes
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <!-- No Records State -->
              <tr v-if="studentRecords.length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <UsersIcon class="mx-auto h-12 w-12 text-gray-300" />
                  <p class="mt-2 text-sm font-medium text-gray-900">
                    No records found
                  </p>
                  <p class="text-sm text-gray-600">
                    Try adjusting your search or date filters
                  </p>
                </td>
              </tr>

              <!-- Student Records -->
              <tr
                v-for="record in studentRecords"
                :key="record.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <!-- Student Info -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div
                      class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                    >
                      <span class="text-sm font-medium text-gray-700">
                        {{ getInitials(record.student_name) }}
                      </span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ record.student_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ record.student_id }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Date -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(record.attendance_date) }}
                </td>

                <!-- Time In -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.time_in || "-" }}
                </td>

                <!-- Time Out -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.time_out || "-" }}
                </td>

                <!-- Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusBadgeClass(record.status)"
                  >
                    {{ record.status }}
                  </span>
                </td>

                <!-- Late Minutes -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span
                    v-if="record.late_minutes > 0"
                    class="text-orange-600 font-medium"
                  >
                    {{ record.late_minutes }} min
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && studentRecords.length > 0"
          class="px-6 py-4 flex items-center justify-between border-t border-gray-200"
        >
          <div class="text-sm text-gray-500">
            Showing
            {{ (pagination.current_page - 1) * pagination.per_page + 1 }} to
            {{
              Math.min(
                pagination.current_page * pagination.per_page,
                pagination.total_records
              )
            }}
            of {{ pagination.total_records }} results
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="changePage(pagination.current_page - 1)"
              :disabled="pagination.current_page <= 1"
              class="btn-secondary text-sm"
              :class="{
                'opacity-50 cursor-not-allowed': pagination.current_page <= 1,
              }"
            >
              Previous
            </button>
            <div class="flex items-center space-x-1">
              <button
                v-for="page in visiblePages"
                :key="page"
                @click="changePage(page)"
                class="px-3 py-1 text-sm rounded-md transition-colors"
                :class="[
                  page === pagination.current_page
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
                ]"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="changePage(pagination.current_page + 1)"
              :disabled="pagination.current_page >= pagination.total_pages"
              class="btn-secondary text-sm"
              :class="{
                'opacity-50 cursor-not-allowed':
                  pagination.current_page >= pagination.total_pages,
              }"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { debounce } from "lodash-es";
import {
  ArrowLeftIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";
import { useDashboardApi } from "@/composables/useDashboardApi";
import type {
  StudentRecord,
  StudentRecordsFilter,
  TeacherSummary,
} from "@/composables/useDashboardApi";

// Import skeleton components
import SkeletonLoader from "@/components/common/SkeletonLoader.vue";
import TableSkeleton from "@/components/common/TableSkeleton.vue";

// Composables
const { getStudentRecords, getTeacherSummary } = useDashboardApi();

// Reactive state
const loading = ref(true);
const summaryLoading = ref(true);
const teacherSummary = ref<TeacherSummary | null>(null);
const studentRecords = ref<StudentRecord[]>([]);
const searchQuery = ref("");
const selectedPeriod = ref("today");
const customDateFrom = ref("");
const customDateTo = ref("");

const pagination = ref({
  current_page: 1,
  total_pages: 1,
  total_records: 0,
  per_page: 20,
});

// Computed
const totalStudents = computed(() => teacherSummary.value?.total_students ?? 0);
const totalPresent = computed(() => teacherSummary.value?.present_today ?? 0);
const totalLate = computed(() => teacherSummary.value?.late_today ?? 0);
const totalAbsent = computed(() => teacherSummary.value?.absent_today ?? 0);
const attendanceRate = computed(() =>
  (teacherSummary.value?.attendance_percentage ?? 0).toFixed(1)
);

const visiblePages = computed(() => {
  const pages = [];
  const current = pagination.value.current_page;
  const total = pagination.value.total_pages;

  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);

  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

// Methods
const getFilters = (): StudentRecordsFilter => {
  const today = new Date();
  let dateFrom = "";
  let dateTo = "";

  switch (selectedPeriod.value) {
    case "today":
      dateFrom = dateTo = today.toISOString().split("T")[0];
      break;
    case "week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      dateFrom = weekStart.toISOString().split("T")[0];
      dateTo = weekEnd.toISOString().split("T")[0];
      break;
    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dateFrom = monthStart.toISOString().split("T")[0];
      dateTo = monthEnd.toISOString().split("T")[0];
      break;
    case "custom":
      dateFrom = customDateFrom.value;
      dateTo = customDateTo.value;
      break;
  }

  return {
    student_id: undefined,
    date_from: dateFrom,
    date_to: dateTo,
    page: pagination.value.current_page,
    limit: pagination.value.per_page,
  };
};

const loadStudentRecords = async () => {
  loading.value = true;
  try {
    const filters = getFilters();
    const response = await getStudentRecords(filters);
    if (response.success && response.data) {
      let records = response.data.records;

      // Filter by search query if provided
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase().trim();
        records = records.filter(
          (record) =>
            record.student_name.toLowerCase().includes(query) ||
            record.student_id.toLowerCase().includes(query)
        );
      }

      studentRecords.value = records;
      pagination.value = response.data.pagination;
    }
  } catch (error) {
    console.error("Error loading student records:", error);
  } finally {
    loading.value = false;
  }
};

const loadTeacherSummary = async () => {
  summaryLoading.value = true;
  try {
    const response = await getTeacherSummary();
    if (response.success && response.data) {
      teacherSummary.value = response.data;
    }
  } catch (error) {
    console.error("Error loading teacher summary:", error);
  } finally {
    summaryLoading.value = false;
  }
};

const handlePeriodChange = () => {
  pagination.value.current_page = 1;
  loadStudentRecords();
};

const changePage = (page: number) => {
  if (page >= 1 && page <= pagination.value.total_pages) {
    pagination.value.current_page = page;
    loadStudentRecords();
  }
};

const debouncedSearch = debounce(() => {
  pagination.value.current_page = 1;
  loadStudentRecords();
}, 300);

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "PRESENT":
      return "bg-green-100 text-green-800";
    case "LATE":
      return "bg-orange-100 text-orange-800";
    case "ABSENT":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Lifecycle
onMounted(async () => {
  await Promise.all([loadTeacherSummary(), loadStudentRecords()]);
});
</script>
