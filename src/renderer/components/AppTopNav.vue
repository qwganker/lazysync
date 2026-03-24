<script setup lang="ts">
import { RouterLink } from "vue-router";

const navItems = [
  { label: "首页", routeName: "home" },
  { label: "视频上传", routeName: "videos" },
];
</script>

<template>
  <nav class="top-nav" aria-label="主导航">
    <RouterLink
      v-for="item in navItems"
      :key="item.routeName"
      class="top-nav__link"
      :to="{ name: item.routeName }"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.top-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
  app-region: no-drag;
  -webkit-app-region: no-drag;
}

.top-nav__link {
  padding: 10px 18px;
  border-radius: 999px;
  color: #334155;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.top-nav__link:hover {
  color: #0f172a;
  background: rgba(226, 232, 240, 0.72);
  transform: translateY(-1px);
}

.top-nav__link.router-link-active {
  color: #0f172a;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(14, 165, 233, 0.16));
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.14);
}
</style>
