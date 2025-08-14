<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <ErrorBoundary>
      <router-view />
    </ErrorBoundary>
  </div>
</template>

<script setup lang="ts">
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
</script>
