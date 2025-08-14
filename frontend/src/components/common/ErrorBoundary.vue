<template>
  <div v-if="hasError" class="card border-red-200 bg-red-50">
    <div class="flex items-center">
      <ExclamationTriangleIcon class="h-8 w-8 text-red-600 mr-3" />
      <div>
        <h3 class="text-lg font-semibold text-red-800">Something went wrong</h3>
        <p class="text-red-600 mt-1">{{ errorMessage }}</p>
        <button
          @click="retry"
          class="mt-3 text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, provide, onErrorCaptured } from "vue";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

const hasError = ref(false);
const errorMessage = ref("");

onErrorCaptured((error: any) => {
  hasError.value = true;
  errorMessage.value = error.message || "An unexpected error occurred";
  console.error("Component error:", error);
  return false; // Prevent error from propagating
});

const retry = () => {
  hasError.value = false;
  errorMessage.value = "";
  // Force component re-render by updating key or reloading
  window.location.reload();
};

// Provide error handling to child components
provide("handleError", (error: string) => {
  hasError.value = true;
  errorMessage.value = error;
});
</script>
