<script setup lang="ts">
import { NConfigProvider, zhCN, dateZhCN } from "naive-ui";
import AppTopNav from "./components/AppTopNav.vue";
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <div class="app-drag-region" aria-hidden="true" />
    <div class="app-shell">
      <header class="app-header">
        <AppTopNav />
      </header>
      <main class="app-content">
        <router-view />
      </main>
    </div>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  min-height: 100%;
  padding: 40px 24px 0;
}

.app-drag-region {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 18px;
  z-index: 1000;
  background: transparent;
  app-region: drag;
  -webkit-app-region: drag;
}

.app-header {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.app-content {
  min-height: 100%;
  padding-top: 8px;
}
</style>
