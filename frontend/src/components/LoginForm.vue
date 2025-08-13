<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200"
  >
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden">
      <div
        class="absolute -top-40 -right-32 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"
      ></div>
      <div
        class="absolute -bottom-40 -left-32 w-80 h-80 bg-secondary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute top-40 left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"
      ></div>
    </div>

    <div
      class="relative z-10 card max-w-md w-full space-y-8 bg-white/80 backdrop-blur-sm border border-white/20"
    >
      <!-- Logo with gradient background -->
      <div class="text-center">
        <div
          class="logo-circle bg-gradient-to-br from-primary-600 to-secondary-600 shadow-lg"
        >
          <div class="logo-inner shadow-inner"></div>
        </div>
        <h2 class="text-2xl font-semibold text-gray-900">Welcome</h2>
        <p class="mt-2 text-sm text-gray-600">
          Let's get you signed in securely.
        </p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Email Field -->
        <div class="form-group">
          <label for="email" class="form-label text-gray-700">Email</label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <EnvelopeIcon class="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              required
              class="form-input pl-10 bg-gray-50/50 border-gray-200 focus:bg-white"
              :class="{ 'border-red-300 focus:ring-red-500': errors.email }"
              placeholder="Enter Your Email Address"
              @input="clearFormErrors"
            />
          </div>
          <p v-if="errors.email" class="form-error">{{ errors.email }}</p>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password" class="form-label text-gray-700"
            >Password</label
          >
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <LockClosedIcon class="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="form-input pl-10 pr-12 bg-gray-50/50 border-gray-200 focus:bg-white"
              :class="{ 'border-red-300 focus:ring-red-500': errors.password }"
              placeholder="Your Password"
              @input="clearFormErrors"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            >
              <EyeIcon v-if="showPassword" class="h-5 w-5" />
              <EyeSlashIcon v-else class="h-5 w-5" />
            </button>
          </div>
          <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
        </div>

        <!-- Auth Error Message (Persistent) -->
        <div
          v-if="authError"
          class="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm"
        >
          <div class="flex items-start">
            <ExclamationTriangleIcon
              class="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0"
            />
            <div class="flex-1">
              <p class="text-sm text-red-600 font-medium">{{ authError }}</p>
              <button
                type="button"
                @click="clearError"
                class="mt-2 text-xs text-red-500 hover:text-red-600 underline focus:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          :class="{
            'opacity-75 cursor-not-allowed hover:scale-100': isLoading,
          }"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-4 w-4 mr-2 text-white"
            xmlns="http://www.w3.org/2000/svg"
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
          <span>{{ isLoading ? "Signing in..." : "Log in with Email" }}</span>
        </button>
      </form>

      <!-- Footer -->
      <div class="text-center">
        <p class="text-xs text-gray-500">Secure attendance management system</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/vue/24/outline";

const router = useRouter();
const authStore = useAuthStore();

// Form state
const form = reactive({
  email: "",
  password: "",
});

// UI state
const showPassword = ref(false);
const errors = reactive({
  email: "",
  password: "",
});

// Computed
const isLoading = computed(() => authStore.isLoading);
const authError = computed(() => authStore.error);

// Methods
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const clearFormErrors = () => {
  errors.email = "";
  errors.password = "";
};

const clearError = () => {
  authStore.clearError();
};

const validateForm = (): boolean => {
  clearFormErrors();

  let isValid = true;

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email) {
    errors.email = "Email is required";
    isValid = false;
  } else if (!emailRegex.test(form.email)) {
    errors.email = "Please enter a valid email address";
    isValid = false;
  }

  // Password validation
  if (!form.password) {
    errors.password = "Password is required";
    isValid = false;
  } else if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  // Don't clear auth error immediately - let it persist

  if (!validateForm()) {
    return;
  }

  const result = await authStore.login({
    email: form.email,
    password: form.password,
  });

  if (result.success) {
    router.push("/dashboard");
  }
  // Error will be shown automatically via authError computed
};
</script>
