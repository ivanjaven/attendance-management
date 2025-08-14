<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-xl font-semibold text-gray-900">QR Code Generator</h3>
        <p class="text-gray-600">Generate QR codes for student ID cards</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="selectAllStudents"
          :disabled="isLoading"
          class="btn-secondary"
        >
          Select All
        </button>
        <button
          @click="clearSelection"
          :disabled="isLoading || selectedStudents.length === 0"
          class="btn-secondary"
        >
          Clear Selection
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card-compact">
        <h4 class="text-sm font-medium text-gray-500">Total Students</h4>
        <p class="text-2xl font-bold text-gray-900">{{ students.length }}</p>
      </div>
      <div class="card-compact">
        <h4 class="text-sm font-medium text-gray-500">Selected</h4>
        <p class="text-2xl font-bold text-primary-600">
          {{ selectedStudents.length }}
        </p>
      </div>
      <div class="card-compact">
        <h4 class="text-sm font-medium text-gray-500">Generated</h4>
        <p class="text-2xl font-bold text-green-600">
          {{ generatedQRCodes.length }}
        </p>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="search" class="sr-only">Search students</label>
        <div class="relative">
          <MagnifyingGlassIcon
            class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
          />
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="Search by name or student ID..."
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>
      <select
        v-model="selectedLevel"
        class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">All Levels</option>
        <option v-for="level in levels" :key="level.id" :value="level.level">
          Grade {{ level.level }}
        </option>
      </select>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row gap-3">
      <button
        @click="generateSelectedQRCodes"
        :disabled="isLoading || selectedStudents.length === 0"
        class="btn-primary flex items-center justify-center"
      >
        <QrCodeIcon class="h-5 w-5 mr-2" />
        <span v-if="isLoading">Generating...</span>
        <span v-else>Generate QR Codes ({{ selectedStudents.length }})</span>
      </button>

      <button
        @click="downloadAllAsZip"
        :disabled="generatedQRCodes.length === 0"
        class="btn-secondary flex items-center justify-center"
      >
        <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
        Download All as ZIP
      </button>

      <button
        @click="printAllAsPDF"
        :disabled="generatedQRCodes.length === 0"
        class="btn-secondary flex items-center justify-center"
      >
        <PrinterIcon class="h-5 w-5 mr-2" />
        Print as PDF
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && students.length === 0" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"
      ></div>
      <p class="mt-2 text-gray-600">Loading students...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="flex">
        <ExclamationTriangleIcon class="h-5 w-5 text-red-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error</h3>
          <p class="mt-1 text-sm text-red-700">{{ error }}</p>
          <button
            @click="loadData"
            class="mt-2 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>

    <!-- Students Table -->
    <div v-if="!isLoading && students.length > 0" class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleAllSelection"
                  class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                />
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Student ID
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Level
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="student in filteredStudents"
              :key="student.id"
              :class="{ 'bg-blue-50': selectedStudents.includes(student.id) }"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  :checked="selectedStudents.includes(student.id)"
                  @change="toggleStudentSelection(student.id)"
                  class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                />
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
              >
                {{ student.student_id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ getFullName(student) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                Grade {{ student.level || student.level_id }}
              </td>
              <td
                class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2"
              >
                <button
                  @click="generateSingleQR(student.id)"
                  :disabled="isLoading"
                  class="text-primary-600 hover:text-primary-900"
                >
                  Generate QR
                </button>
                <button
                  v-if="getGeneratedQR(student.id)"
                  @click="downloadSingleQR(student.id)"
                  class="text-green-600 hover:text-green-900"
                >
                  Download
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!isLoading && students.length === 0 && !error"
      class="text-center py-8"
    >
      <UsersIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">No students found</h3>
      <p class="mt-1 text-sm text-gray-500">
        Get started by adding some students to the system.
      </p>
    </div>

    <!-- Generated QR Codes Preview -->
    <div v-if="generatedQRCodes.length > 0" class="card">
      <h4 class="text-lg font-semibold text-gray-900 mb-4">
        Generated QR Codes
      </h4>
      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <div
          v-for="qr in generatedQRCodes"
          :key="qr.studentId"
          class="text-center p-3 bg-gray-50 rounded-lg"
        >
          <img
            :src="qr.qrCodeImage"
            :alt="`QR Code for ${qr.studentId}`"
            class="w-20 h-20 mx-auto mb-2 border border-gray-200 rounded"
          />
          <p class="text-xs font-medium text-gray-700">{{ qr.studentId }}</p>
          <button
            @click="downloadSingleQRByStudentId(qr.studentId)"
            class="mt-1 text-xs text-primary-600 hover:text-primary-900"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { AdminService } from "@/services/adminService";
import type { Student, Level } from "@/services/adminService";
import {
  MagnifyingGlassIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from "@heroicons/vue/24/outline";

// State
const students = ref<Student[]>([]);
const levels = ref<Level[]>([]);
const selectedStudents = ref<number[]>([]);
const generatedQRCodes = ref<Array<{ studentId: string; qrCodeImage: string }>>(
  []
);
const isLoading = ref(false);
const error = ref<string>("");
const searchQuery = ref("");
const selectedLevel = ref("");

// Computed
const filteredStudents = computed(() => {
  let filtered = students.value;

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (student) =>
        student.student_id.toLowerCase().includes(query) ||
        getFullName(student).toLowerCase().includes(query)
    );
  }

  // Filter by level
  if (selectedLevel.value) {
    filtered = filtered.filter(
      (student) =>
        (student.level || student.level_id).toString() === selectedLevel.value
    );
  }

  return filtered;
});

const isAllSelected = computed(() => {
  return (
    filteredStudents.value.length > 0 &&
    filteredStudents.value.every((student) =>
      selectedStudents.value.includes(student.id)
    )
  );
});

// Methods
const getFullName = (student: Student): string => {
  const parts = [student.first_name];
  if (student.middle_name) parts.push(student.middle_name);
  parts.push(student.last_name);
  return parts.join(" ");
};

const loadData = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    const [studentsData, levelsData] = await Promise.all([
      AdminService.getStudents(),
      AdminService.getLevels(),
    ]);

    students.value = studentsData;
    levels.value = levelsData;
  } catch (err: any) {
    console.error("Failed to load data:", err);
    error.value = err.message || "Failed to load data";
  } finally {
    isLoading.value = false;
  }
};

const toggleStudentSelection = (studentId: number) => {
  const index = selectedStudents.value.indexOf(studentId);
  if (index > -1) {
    selectedStudents.value.splice(index, 1);
  } else {
    selectedStudents.value.push(studentId);
  }
};

const toggleAllSelection = () => {
  if (isAllSelected.value) {
    // Deselect all filtered students
    const filteredIds = filteredStudents.value.map((s) => s.id);
    selectedStudents.value = selectedStudents.value.filter(
      (id) => !filteredIds.includes(id)
    );
  } else {
    // Select all filtered students
    const filteredIds = filteredStudents.value.map((s) => s.id);
    const newSelections = filteredIds.filter(
      (id) => !selectedStudents.value.includes(id)
    );
    selectedStudents.value.push(...newSelections);
  }
};

const selectAllStudents = () => {
  selectedStudents.value = students.value.map((s) => s.id);
};

const clearSelection = () => {
  selectedStudents.value = [];
};

const generateSingleQR = async (studentId: number) => {
  try {
    isLoading.value = true;
    const response = await AdminService.generateStudentQRCode(studentId);

    if (response.success && response.data) {
      const student = students.value.find((s) => s.id === studentId);
      generatedQRCodes.value.push({
        studentId: student?.student_id || studentId.toString(),
        qrCodeImage: response.data.qr_code_image,
      });
    }
  } catch (error: any) {
    console.error("Failed to generate QR code:", error);
    alert(error.message || "Failed to generate QR code");
  } finally {
    isLoading.value = false;
  }
};

const generateSelectedQRCodes = async () => {
  if (selectedStudents.value.length === 0) return;

  try {
    isLoading.value = true;
    const response = await AdminService.generateBatchQRCodes(
      selectedStudents.value
    );

    if (response.success && response.data) {
      generatedQRCodes.value = response.data;
    }
  } catch (error: any) {
    console.error("Failed to generate QR codes:", error);
    alert(error.message || "Failed to generate QR codes");
  } finally {
    isLoading.value = false;
  }
};

const getGeneratedQR = (studentId: number) => {
  const student = students.value.find((s) => s.id === studentId);
  return generatedQRCodes.value.find(
    (qr) => qr.studentId === student?.student_id
  );
};

const downloadSingleQR = (studentId: number) => {
  const qr = getGeneratedQR(studentId);
  if (qr) {
    downloadImage(qr.qrCodeImage, `QR_${qr.studentId}.png`);
  }
};

const downloadSingleQRByStudentId = (studentId: string) => {
  const qr = generatedQRCodes.value.find((q) => q.studentId === studentId);
  if (qr) {
    downloadImage(qr.qrCodeImage, `QR_${qr.studentId}.png`);
  }
};

const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadAllAsZip = async () => {
  // Download individual files with delay
  for (const qr of generatedQRCodes.value) {
    downloadImage(qr.qrCodeImage, `QR_${qr.studentId}.png`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const printAllAsPDF = () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student QR Codes</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; }
        .header { text-align: center; padding: 20px; border-bottom: 2px solid #ccc; }
        .qr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 20px; }
        .qr-item { text-align: center; page-break-inside: avoid; border: 1px solid #eee; padding: 10px; }
        .qr-item img { width: 120px; height: 120px; border: 1px solid #ccc; }
        .qr-item p { margin: 5px 0; font-weight: bold; font-size: 12px; }
        @media print { 
          .qr-grid { grid-template-columns: repeat(3, 1fr); gap: 15px; } 
          .qr-item img { width: 100px; height: 100px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Student QR Codes</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="qr-grid">
        ${generatedQRCodes.value
          .map(
            (qr) => `
          <div class="qr-item">
            <img src="${qr.qrCodeImage}" alt="QR Code for ${qr.studentId}" />
            <p>${qr.studentId}</p>
          </div>
        `
          )
          .join("")}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

// Lifecycle
onMounted(() => {
  loadData();
});
</script>
