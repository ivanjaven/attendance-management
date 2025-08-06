<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="card max-w-md w-full">
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-6">
        Attendance System
      </h1>
      <p class="text-gray-600 text-center mb-8">
        QR Code-based attendance management for schools
      </p>
      <div class="space-y-4">
        <router-link
          to="/login"
          class="btn-primary w-full text-center block"
        >
          Login
        </router-link>
        <router-link
          to="/dashboard"
          class="btn-secondary w-full text-center block"
        >
          Dashboard
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component logic goes here
</script>

<style scoped>
/* Component-specific styles */
</style>
