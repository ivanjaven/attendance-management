<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="card max-w-md w-full">
      <h2 class="text-2xl font-bold text-center text-gray-900 mb-6">
        Login
      </h2>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="input-field"
            placeholder="Enter your email"
          >
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            class="input-field"
            placeholder="Enter your password"
          >
        </div>
        <button type="submit" class="btn-primary w-full">
          Login
        </button>
      </form>
      <div class="mt-4 text-center">
        <router-link to="/" class="text-primary-600 hover:text-primary-500">
          Back to Home
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  email: '',
  password: ''
})

const handleLogin = () => {
  console.log('Login attempt:', form)
  // TODO: Implement login logic
}
</script>
