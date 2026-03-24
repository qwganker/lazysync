import type { RouteRecordRaw } from "vue-router";
import HomeView from "../views/home/HomeView.vue";
import VideoListView from "../views/videos/VideoListView.vue";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/videos",
    name: "videos",
    component: VideoListView,
  },
];
