import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import LoginView from "@/views/LoginView.vue";
import DashboardView from "@/views/DashboardView.vue";
import QRScannerView from "@/views/QRScannerView.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: "/qr-scanner",
    name: "qr-scanner",
    component: QRScannerView,
    meta: { requiresAuth: true },
  },
  {
    path: "/admin",
    name: "admin",
    redirect: "/dashboard",
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      // Future admin-specific routes can go here
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  authStore.initAuth();

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next("/login");
    return;
  }

  // Check guest routes
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next("/dashboard");
    return;
  }

  // Check admin access
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next("/dashboard"); // Redirect non-admins to dashboard
    return;
  }

  next();
});

export default router;
