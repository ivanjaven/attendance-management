<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div
      class="animate-spin rounded-full border-2 border-gray-300 border-t-primary-600"
      :class="sizeClass"
    ></div>
    <span v-if="text" class="ml-3 text-gray-600" :class="textClass">{{
      text
    }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  size?: "sm" | "md" | "lg";
  text?: string;
  container?: "inline" | "block" | "full";
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  container: "inline",
});

const sizeClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "h-4 w-4";
    case "lg":
      return "h-8 w-8";
    default:
      return "h-6 w-6";
  }
});

const textClass = computed(() => {
  switch (props.size) {
    case "sm":
      return "text-sm";
    case "lg":
      return "text-lg";
    default:
      return "text-base";
  }
});

const containerClass = computed(() => {
  switch (props.container) {
    case "block":
      return "w-full py-4";
    case "full":
      return "min-h-[200px] w-full";
    default:
      return "";
  }
});
</script>
