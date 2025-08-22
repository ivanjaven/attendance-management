<template>
  <div
    class="animate-pulse bg-gray-200 rounded"
    :class="[
      widthClass,
      heightClass,
      variant === 'circular' ? 'rounded-full' : 'rounded',
    ]"
  ></div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  width?: string | number;
  height?: string | number;
  variant?: "rectangular" | "circular" | "text";
  lines?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: "100%",
  height: "1rem",
  variant: "rectangular",
  lines: 1,
});

const widthClass = computed(() => {
  if (typeof props.width === "number") {
    return `w-${props.width}`;
  }
  if (props.width === "100%") {
    return "w-full";
  }
  return props.width;
});

const heightClass = computed(() => {
  if (typeof props.height === "number") {
    return `h-${props.height}`;
  }
  if (props.variant === "text") {
    return "h-4";
  }
  return `h-${props.height}`;
});
</script>
