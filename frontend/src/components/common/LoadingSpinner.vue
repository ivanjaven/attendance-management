<!-- frontend/src/components/common/LoadingSpinner.vue -->
<template>
  <div :class="containerClass">
    <div :class="spinnerClass">
      <div
        class="animate-spin rounded-full border-b-2"
        :class="sizeClass"
      ></div>
    </div>
    <p v-if="message" :class="messageClass">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "white";
  message?: string;
  centered?: boolean;
  fullHeight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  variant: "primary",
  centered: true,
  fullHeight: false,
});

const containerClass = computed(() => {
  const classes = [];

  if (props.centered) {
    classes.push("flex flex-col items-center justify-center");
  }

  if (props.fullHeight) {
    classes.push("min-h-screen");
  } else {
    classes.push("py-8");
  }

  return classes.join(" ");
});

const spinnerClass = computed(() => {
  return "flex items-center justify-center";
});

const sizeClass = computed(() => {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const colorMap = {
    primary: "border-primary-600",
    secondary: "border-secondary-600",
    white: "border-white",
  };

  return `${sizeMap[props.size]} ${colorMap[props.variant]}`;
});

const messageClass = computed(() => {
  const baseClasses = "mt-4 text-center";

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const colorClasses = {
    primary: "text-gray-600",
    secondary: "text-gray-600",
    white: "text-white",
  };

  return `${baseClasses} ${sizeClasses[props.size]} ${
    colorClasses[props.variant]
  }`;
});
</script>
