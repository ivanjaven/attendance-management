<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-4"
  >
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="logo-circle bg-gradient-to-br from-primary-600 to-secondary-600 shadow-lg mb-4 mx-auto"
        >
          <div class="logo-inner shadow-inner"></div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">QR Code Scanner</h1>
        <p class="text-gray-600">
          Scan student QR codes for attendance tracking
        </p>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <!-- Left Side: Scanner -->
        <div class="space-y-6">
          <div class="card">
            <div class="text-center mb-6">
              <div
                class="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
              >
                <!-- QR Logo SVG -->
                <svg
                  class="w-8 h-8 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  fb21e2d2-e932-4913-bf28-a78a0c4e8ddd

                  <!-- Top left corner -->
                  <rect x="2" y="2" width="7" height="7" />
                  <rect x="3" y="3" width="5" height="5" fill="white" />
                  <rect x="4" y="4" width="3" height="3" />

                  <!-- Top right corner -->
                  <rect x="15" y="2" width="7" height="7" />
                  <rect x="16" y="3" width="5" height="5" fill="white" />
                  <rect x="17" y="4" width="3" height="3" />

                  <!-- Bottom left corner -->
                  <rect x="2" y="15" width="7" height="7" />
                  <rect x="3" y="16" width="5" height="5" fill="white" />
                  <rect x="4" y="17" width="3" height="3" />

                  <!-- Timing patterns -->
                  <rect x="10" y="2" width="1" height="1" />
                  <rect x="10" y="4" width="1" height="1" />
                  <rect x="10" y="6" width="1" height="1" />
                  <rect x="10" y="8" width="1" height="1" />

                  <rect x="2" y="10" width="1" height="1" />
                  <rect x="4" y="10" width="1" height="1" />
                  <rect x="6" y="10" width="1" height="1" />
                  <rect x="8" y="10" width="1" height="1" />

                  <!-- Data modules pattern -->
                  <rect x="12" y="4" width="1" height="1" />
                  <rect x="14" y="4" width="1" height="1" />
                  <rect x="11" y="6" width="1" height="1" />
                  <rect x="13" y="6" width="1" height="1" />

                  <rect x="11" y="11" width="1" height="1" />
                  <rect x="13" y="11" width="1" height="1" />
                  <rect x="15" y="11" width="1" height="1" />
                  <rect x="17" y="11" width="1" height="1" />
                  <rect x="19" y="11" width="1" height="1" />
                  <rect x="21" y="11" width="1" height="1" />

                  <rect x="11" y="13" width="1" height="1" />
                  <rect x="14" y="13" width="1" height="1" />
                  <rect x="16" y="13" width="1" height="1" />
                  <rect x="18" y="13" width="1" height="1" />
                  <rect x="20" y="13" width="1" height="1" />

                  <rect x="12" y="15" width="1" height="1" />
                  <rect x="15" y="15" width="1" height="1" />
                  <rect x="17" y="15" width="1" height="1" />
                  <rect x="19" y="15" width="1" height="1" />
                  <rect x="21" y="15" width="1" height="1" />

                  <rect x="11" y="17" width="1" height="1" />
                  <rect x="13" y="17" width="1" height="1" />
                  <rect x="16" y="17" width="1" height="1" />
                  <rect x="18" y="17" width="1" height="1" />
                  <rect x="20" y="17" width="1" height="1" />

                  <rect x="12" y="19" width="1" height="1" />
                  <rect x="14" y="19" width="1" height="1" />
                  <rect x="17" y="19" width="1" height="1" />
                  <rect x="19" y="19" width="1" height="1" />
                  <rect x="21" y="19" width="1" height="1" />

                  <rect x="11" y="21" width="1" height="1" />
                  <rect x="13" y="21" width="1" height="1" />
                  <rect x="15" y="21" width="1" height="1" />
                  <rect x="18" y="21" width="1" height="1" />
                  <rect x="20" y="21" width="1" height="1" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-gray-900 mb-2">
                Scan QR Code
              </h2>
            </div>

            <div class="space-y-4">
              <div class="form-group">
                <label for="qrInput" class="form-label sr-only"
                  >QR Code Input</label
                >
                <div class="relative">
                  <input
                    id="qrInput"
                    ref="qrInputRef"
                    v-model="qrInput"
                    type="password"
                    class="form-input text-center text-lg font-mono tracking-wider border-2 border-primary-300 focus:border-primary-500 bg-gray-50"
                    placeholder="●●●●●●●●●●●●●●●●●●●●"
                    @keydown.enter="handleScan"
                    @input="handleInput"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <div
                    class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                  >
                    <div
                      v-if="isLoading"
                      class="animate-spin h-5 w-5 text-primary-600"
                    >
                      <svg fill="none" viewBox="0 0 24 24">
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
                    </div>
                    <svg
                      v-else
                      class="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      ></path>
                    </svg>
                  </div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-2">
                  Encrypted scan input
                </p>
              </div>

              <button
                @click="handleScan"
                :disabled="!qrInput.trim() || isLoading"
                class="btn-primary w-full py-4 text-lg"
                :class="{
                  'opacity-50 cursor-not-allowed': !qrInput.trim() || isLoading,
                }"
              >
                <svg
                  v-if="isLoading"
                  class="animate-spin h-6 w-6 mr-3"
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
                {{ isLoading ? "Processing..." : "Process Scan" }}
              </button>
            </div>
          </div>

          <!-- Instructions Card -->
          <div class="card bg-blue-50 border-blue-200">
            <h3 class="font-medium text-blue-900 mb-3">
              Scanning Instructions
            </h3>
            <ul class="space-y-2 text-sm text-blue-800">
              <li class="flex items-center">
                <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Scan your QR code using barcode scanner
              </li>
              <li class="flex items-center">
                <div class="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                Results will appear on the right side
              </li>
            </ul>
          </div>
        </div>

        <!-- Right Side: Results -->
        <div class="space-y-6">
          <!-- Success Result -->
          <transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 transform scale-95"
            enter-to-class="opacity-100 transform scale-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 transform scale-100"
            leave-to-class="opacity-0 transform scale-95"
          >
            <div
              v-if="scanResult && scanResult.success"
              class="card border-green-200 bg-green-50"
            >
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <div
                    class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <svg
                      class="h-7 w-7 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-4 flex-1">
                  <h3 class="text-lg font-semibold text-green-900 mb-4">
                    {{
                      scanResult.data?.action === "time_in"
                        ? "✅ Time In Successful"
                        : "✅ Time Out Successful"
                    }}
                  </h3>

                  <!-- Student Info -->
                  <div class="space-y-4">
                    <div
                      class="bg-white rounded-lg p-4 shadow-sm border border-green-100"
                    >
                      <h4
                        class="font-medium text-gray-900 mb-3 flex items-center"
                      >
                        <svg
                          class="w-5 h-5 text-gray-600 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          ></path>
                        </svg>
                        Student Information
                      </h4>
                      <div class="grid grid-cols-1 gap-2 text-sm">
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600">ID:</span>
                          <span class="font-mono">{{
                            scanResult.data?.student.student_id
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600">Name:</span>
                          <span>{{
                            formatStudentName(scanResult.data?.student)
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600">Class:</span>
                          <span>{{
                            formatStudentClass(scanResult.data?.student)
                          }}</span>
                        </div>
                        <div
                          v-if="scanResult.data?.student.adviser"
                          class="flex justify-between"
                        >
                          <span class="font-medium text-gray-600"
                            >Adviser:</span
                          >
                          <span>{{
                            formatAdviserName(scanResult.data?.student.adviser)
                          }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Attendance Info -->
                    <div
                      class="bg-white rounded-lg p-4 shadow-sm border border-green-100"
                    >
                      <h4
                        class="font-medium text-gray-900 mb-3 flex items-center"
                      >
                        <svg
                          class="w-5 h-5 text-gray-600 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                        Attendance Details
                      </h4>
                      <div class="grid grid-cols-1 gap-2 text-sm">
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600"
                            >Time In:</span
                          >
                          <span class="font-mono">{{
                            formatTime(scanResult.data?.attendance_log.time_in)
                          }}</span>
                        </div>
                        <div
                          v-if="scanResult.data?.attendance_log.time_out"
                          class="flex justify-between"
                        >
                          <span class="font-medium text-gray-600"
                            >Time Out:</span
                          >
                          <span class="font-mono">{{
                            formatTime(scanResult.data?.attendance_log.time_out)
                          }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="font-medium text-gray-600">Status:</span>
                          <span
                            v-if="scanResult.data?.is_late"
                            class="text-orange-600 font-medium"
                          >
                            Late
                          </span>
                          <span v-else class="text-green-600 font-medium"
                            >On Time</span
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Late Warning -->
                    <div
                      v-if="
                        scanResult.data?.total_late_minutes &&
                        scanResult.data.total_late_minutes > 50
                      "
                      class="bg-orange-50 border border-orange-200 rounded-lg p-4"
                    >
                      <div class="flex items-center">
                        <svg
                          class="h-6 w-6 text-orange-500 mr-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <div>
                          <p class="text-sm font-medium text-orange-800">
                            Late Warning
                          </p>
                          <p class="text-sm text-orange-700">
                            Total late minutes this quarter:
                            {{ scanResult.data.total_late_minutes }}/70
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <!-- Error Result -->
          <transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="opacity-0 transform scale-95"
            enter-to-class="opacity-100 transform scale-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="opacity-100 transform scale-100"
            leave-to-class="opacity-0 transform scale-95"
          >
            <div v-if="scanError" class="card border-red-200 bg-red-50">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <div
                    class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <svg
                      class="h-7 w-7 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-4 flex-1">
                  <h3 class="text-lg font-semibold text-red-900 mb-2">
                    ❌ Scan Failed
                  </h3>
                  <p
                    class="text-sm text-red-700 bg-white rounded p-3 border border-red-100"
                  >
                    {{ scanError }}
                  </p>
                </div>
              </div>
            </div>
          </transition>

          <!-- Placeholder when no results -->
          <div
            v-if="!scanResult && !scanError"
            class="card bg-gray-50 border-gray-200 border-dashed"
          >
            <div class="text-center py-8">
              <svg
                class="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900">
                Ready to Scan
              </h3>
              <p class="mt-2 text-sm text-gray-500">
                Student information will appear here after scanning
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Back Button -->
      <div class="text-center mt-8">
        <button
          @click="$router.push('/dashboard')"
          class="btn-outline px-8 py-3"
        >
          <svg
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            ></path>
          </svg>
          Back to Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from "vue";
import {
  AttendanceService,
  type QRScanResponse,
} from "@/services/attendanceService";

const qrInput = ref("");
const qrInputRef = ref<HTMLInputElement>();
const isLoading = ref(false);
const scanResult = ref<QRScanResponse | null>(null);
const scanError = ref<string | null>(null);
let clearTimer: number | null = null;
let refocusTimer: number | null = null;

const handleInput = () => {
  clearError();
  clearResult();

  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
};

const clearError = () => {
  scanError.value = null;
};

const clearResult = () => {
  scanResult.value = null;
};

const handleScan = async () => {
  if (!qrInput.value.trim()) return;

  isLoading.value = true;
  clearError();
  clearResult();

  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }

  try {
    const result = await AttendanceService.scanQR(qrInput.value.trim());
    scanResult.value = result;
    qrInput.value = "";

    // Auto-clear result after 5 seconds
    clearTimer = window.setTimeout(() => {
      clearResult();
    }, 8000);

    await nextTick();
    qrInputRef.value?.focus();
  } catch (error: any) {
    scanError.value = error.message || "Scan failed";
    qrInput.value = "";

    // Auto-clear error after 5 seconds
    clearTimer = window.setTimeout(() => {
      clearError();
    }, 5000);

    await nextTick();
    qrInputRef.value?.focus();
  } finally {
    isLoading.value = false;
  }
};

const formatStudentName = (student: any) => {
  if (!student) return "";
  const middle = student.middle_name
    ? ` ${student.middle_name.charAt(0)}.`
    : "";
  return `${student.first_name}${middle} ${student.last_name}`;
};

const formatStudentClass = (student: any) => {
  if (!student) return "";
  const parts = [];
  if (student.level) parts.push(`Grade ${student.level}`);
  if (student.specialization) parts.push(student.specialization);
  if (student.section) parts.push(student.section);
  return parts.join(" - ");
};

const formatAdviserName = (adviser: any) => {
  if (!adviser) return "";
  const middle = adviser.middle_name
    ? ` ${adviser.middle_name.charAt(0)}.`
    : "";
  return `${adviser.first_name}${middle} ${adviser.last_name}`;
};

const formatTime = (time: string | undefined) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
};

const maintainFocus = () => {
  if (document.activeElement !== qrInputRef.value) {
    qrInputRef.value?.focus();
  }
};

onMounted(() => {
  qrInputRef.value?.focus();

  // Periodically refocus the input to ensure it stays focused
  refocusTimer = window.setInterval(maintainFocus, 2000);
});

onBeforeUnmount(() => {
  if (clearTimer) {
    clearTimeout(clearTimer);
  }
  if (refocusTimer) {
    clearInterval(refocusTimer);
  }
});
</script>
