<template>
  <LoginForm />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import LoginForm from "@/components/LoginForm.vue";

const router = useRouter();
const authStore = useAuthStore();

// Redirect if already authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push("/dashboard");
  }
});
</script>
