<template>
  <div
    class="text-sm h-screen"
    :style="{
      backgroundColor: store.setting.appearance.theme.mainBackgroundColor,
      color: store.setting.appearance.theme.mainFontColor,
      borderRadius:
        store.setting.appearance.transparency < 1 &&
        store.setting.appearance.windowRounded
          ? '8px'
          : undefined,
    }"
  >
    <div class="flex items-center px-2 app-region-drag">
      <h1 class="w-full text-sm flex items-center h-[34px] app-region-drag">
        {{ store.language.about }}
      </h1>
      <Icon
        class="close-icon app-region-no-drag"
        size="18"
        @click="close"
        @mouseover="setIconStyle($event, 'close-icon', store.setting)"
        @mouseout="removeIconStyle($event, 'close-icon')"
        :title="store.language.close"
      >
        <CloseRound></CloseRound>
      </Icon>
    </div>
    <div class="px-4">
      <img
        src="/logo-transparent.png"
        class="w-56 h-24 mx-auto block object-contain"
        draggable="false"
      />
      <p class="mt-2">KK Desk {{ version }}</p>
      <p class="mt-2">Copyright © 2026 KK Desk contributors</p>
      <p class="mt-2">{{ store.language.unofficialFork }}</p>
      <p class="mt-2">{{ store.language.upstreamCopyright }}</p>
      <p class="mt-2">
        {{ store.language.projectRepository }}{{ store.language.colon }}
        <span @click="openProject" class="cursor-pointer">github.com/laikang287/kk-desk</span>
      </p>
      <p class="mt-2">
        {{ store.language.upstreamProject }}{{ store.language.colon }}
        <span @click="openUpstream" class="cursor-pointer">github.com/fanchenio/DawnLauncher</span>
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from "vue";
import { setIconStyle, removeIconStyle } from "../../utils/style";
import { Icon } from "@vicons/utils";
import { CloseRound } from "@vicons/material";
import { useMainStore } from "../../store";
// pinia
const store = useMainStore();
// 版本
let version = window.api.getVersion();
function openProject() {
  window.api.openURL("https://github.com/laikang287/kk-desk");
}
function openUpstream() {
  window.api.openURL("https://github.com/fanchenio/DawnLauncher");
}
// 关闭
function close() {
  window.about.closeWindow();
}
// 加载完dom后再显示页面
nextTick(() => {
  window.about.showWindow();
});
// 键盘按下
function keydown(e: any) {
  if (e.keyCode === 27) {
    // ESC
    close();
    e.preventDefault();
    e.stopPropagation();
    return;
  }
}
// moutned
onMounted(() => {
  // 监听键盘
  window.addEventListener("keydown", keydown, true);
});
// unmounted
onUnmounted(() => {
  // 监听键盘
  window.removeEventListener("keydown", keydown, true);
});
</script>
