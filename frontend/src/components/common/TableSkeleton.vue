<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="header in headers"
            :key="header"
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-for="row in rows" :key="row" class="animate-pulse">
          <td
            v-for="(header, index) in headers"
            :key="`${row}-${index}`"
            class="px-6 py-4 whitespace-nowrap"
          >
            <div v-if="index === 0" class="flex items-center">
              <!-- Avatar skeleton -->
              <SkeletonLoader
                variant="circular"
                width="2.5rem"
                height="2.5rem"
                class="flex-shrink-0"
              />
              <div class="ml-4 space-y-2">
                <!-- Name skeleton -->
                <SkeletonLoader width="8rem" height="1rem" />
                <!-- ID skeleton -->
                <SkeletonLoader width="6rem" height="0.75rem" />
              </div>
            </div>
            <div v-else-if="index === 4" class="flex justify-start">
              <!-- Status badge skeleton -->
              <SkeletonLoader
                width="4rem"
                height="1.5rem"
                class="rounded-full"
              />
            </div>
            <div v-else>
              <!-- Regular content skeleton -->
              <SkeletonLoader :width="getColumnWidth(index)" height="1rem" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoader from "./SkeletonLoader.vue";

interface Props {
  headers: string[];
  rows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  rows: 5,
});

const getColumnWidth = (index: number) => {
  // Customize width based on column type
  const widths = ["8rem", "6rem", "4rem", "4rem", "3rem", "3rem"];
  return widths[index] || "6rem";
};
</script>
