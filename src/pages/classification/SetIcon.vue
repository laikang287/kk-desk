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
        {{ store.language.setClassificationIcon }}
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
    <div class="text-[20px] w-full content">
      <div
        class="flex pb-[4px] border-b-[1px] px-2"
        style="border-bottom-style: solid"
        :style="{ borderColor: store.setting.appearance.theme.borderColor }"
        @mouseover="mouseover($event, 'icon-classification')"
        @mouseout="mouseout($event, 'icon-classification')"
      >
        <span
          class="icon-classification w-[36px] h-[36px] ml-[2px] flex items-center justify-center rounded leading-4"
          :style="{
            backgroundColor:
              selected === key.toString()
                ? store.setting.appearance.theme.secondBackgroundColor
                : undefined,
          }"
          v-for="(values, key) in emoji"
          :key="key"
          :name="key"
          @click="selected = key.toString()"
        >
          <span
            :title="key.toString()"
            class="w-[36px] h-[36px] flex items-center justify-center"
            >{{ values[0]["value"] }}</span
          >
        </span>
      </div>
      <div id="content" class="max-h-[425px] overflow-x-hidden" :key="selected">
        <ul
          class="flex flex-wrap my-[4px] px-2"
          @mouseover="mouseover($event, 'icon-item')"
          @mouseout="mouseout($event, 'icon-item')"
        >
          <li
            class="icon-item w-[36px] h-[36px] flex items-center justify-center ml-[2px] rounded truncate leading-4"
            v-for="e in emoji[selected]"
            @click="setIcon(e.value)"
          >
            <span
              :title="getEmojiName(e.value, e.name)"
              class="w-[36px] h-[36px] flex items-center justify-center"
              >{{ e.value }}</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, onUpdated } from "vue";
import { Icon } from "@vicons/utils";
import { CloseRound } from "@vicons/material";
import SimpleBar from "simplebar";
import "simplebar/dist/simplebar.css";
import {
  getClassElement,
  setStyle,
  removeStyle,
  setIconStyle,
  removeIconStyle,
} from "../../utils/style";
import {
  simplifiedChineseEmoji,
  traditionalChineseEmoji,
  englishEmoji,
} from "./js/emoji";
import { resolveLanguage } from "../../../commons/data/languages";
import { useMainStore } from "../../store";
// pinia
const store = useMainStore();
// 获取页面参数
const queryParams = new URLSearchParams(window.location.search);
// 获取ID
let id = parseInt(queryParams.get("id")!);
// emoji
let emoji: any = [];
const language = resolveLanguage(store.setting.general.language, navigator.language);
const emojiNameTranslations = ref<Record<string, string>>({});
const emojiNameLoaders: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  Japanese: () => import("../../../commons/data/locales/emoji/ja.json"),
  Korean: () => import("../../../commons/data/locales/emoji/ko.json"),
  French: () => import("../../../commons/data/locales/emoji/fr.json"),
  German: () => import("../../../commons/data/locales/emoji/de.json"),
  Spanish: () => import("../../../commons/data/locales/emoji/es.json"),
  Russian: () => import("../../../commons/data/locales/emoji/ru.json"),
};
if (emojiNameLoaders[language]) {
  void emojiNameLoaders[language]().then(({ default: names }) => {
    emojiNameTranslations.value = names;
  });
}
if (language === "SimplifiedChinese") {
  emoji = simplifiedChineseEmoji;
} else if (language === "TraditionalChinese") {
  emoji = traditionalChineseEmoji;
} else if (language === "English") {
  emoji = englishEmoji;
} else {
  const categoryLabels: Record<string, Record<string, string>> = {
    Japanese: { Smileys: "顔文字と感情", People: "人", Animals: "動物", Food: "食べ物", Travel: "旅行と場所", Activities: "アクティビティ", Objects: "物", Symbols: "記号", Flags: "旗" },
    Korean: { Smileys: "이모티콘 및 감정", People: "사람", Animals: "동물", Food: "음식", Travel: "여행 및 장소", Activities: "활동", Objects: "사물", Symbols: "기호", Flags: "깃발" },
    French: { Smileys: "Émoticônes et émotions", People: "Personnes", Animals: "Animaux", Food: "Nourriture", Travel: "Voyages et lieux", Activities: "Activités", Objects: "Objets", Symbols: "Symboles", Flags: "Drapeaux" },
    German: { Smileys: "Smileys und Emotionen", People: "Menschen", Animals: "Tiere", Food: "Essen", Travel: "Reisen und Orte", Activities: "Aktivitäten", Objects: "Objekte", Symbols: "Symbole", Flags: "Flaggen" },
    Spanish: { Smileys: "Caras y emociones", People: "Personas", Animals: "Animales", Food: "Comida", Travel: "Viajes y lugares", Activities: "Actividades", Objects: "Objetos", Symbols: "Símbolos", Flags: "Banderas" },
    Russian: { Smileys: "Эмоции и смайлы", People: "Люди", Animals: "Животные", Food: "Еда", Travel: "Путешествия и места", Activities: "Занятия", Objects: "Предметы", Symbols: "Символы", Flags: "Флаги" },
  };
  const labels = categoryLabels[language] ?? {};
  emoji = Object.fromEntries(
    Object.entries(englishEmoji).map(([category, values]) => [
      labels[category] ?? category,
      values,
    ])
  );
}
// 选中
let selected = ref(Object.keys(emoji)[0]);
// 设置图标
async function setIcon(icon: string) {
  let res: boolean = window.classification.updateIcon(id, icon);
  if (res) {
    window.api.emit("mainWindow", "onUpdateClassificationIcon", {
      id: id,
      icon: icon,
    });
  }
  close();
}
function getEmojiName(value: string, fallback: string) {
  const key = value.replace(/[\uFE0E\uFE0F]/g, "");
  return emojiNameTranslations.value[key] ?? fallback;
}
// 加载完dom后再显示页面
nextTick(() => {
  window.classification.showSetIconWindow();
});
// 关闭窗口
function close() {
  window.classification.closeSetIconWindow();
}
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
// mouseover
function mouseover(e: any, cls: string) {
  // 鼠标经过添加分类样式
  if (cls === "icon-classification") {
    if (getClassElement(e, cls)) {
      let style: Map<string, string> = new Map();
      style.set(
        "background-color",
        store.setting.appearance.theme.secondBackgroundColor
      );
      setStyle(e, cls, style);
    }
  } else if (cls === "icon-item") {
    if (getClassElement(e, cls)) {
      let style: Map<string, string> = new Map();
      style.set(
        "background-color",
        store.setting.appearance.theme.secondBackgroundColor
      );
      setStyle(e, cls, style);
    }
  }
}
// mouseout
function mouseout(e: any, cls: string) {
  // 鼠标移走删除分类样式
  if (cls === "icon-classification") {
    if (getClassElement(e, cls)) {
      let element = getClassElement(e, cls);
      let key = element.getAttribute("name");
      if (selected.value !== key) {
        let style: Map<string, string | null> = new Map();
        style.set("background-color", null);
        removeStyle(e, cls, style);
      }
    }
  } else if (cls === "icon-item") {
    let style: Map<string, string | null> = new Map();
    style.set("background-color", null);
    removeStyle(e, cls, style);
  }
}
// 创建滚动条
function createSimpleBar() {
  let element = document.getElementById("content");
  if (element) {
    new SimpleBar(element);
  }
}
// updated
onUpdated(() => {
  // 刷新DOM完毕执行
  nextTick(() => {
    // 滚动条
    createSimpleBar();
  });
});
// moutned
onMounted(() => {
  // 监听键盘
  window.addEventListener("keydown", keydown, true);
  // 刷新DOM完毕执行
  nextTick(() => {
    // 滚动条
    createSimpleBar();
  });
});
// unmounted
onUnmounted(() => {
  // 监听键盘
  window.removeEventListener("keydown", keydown, true);
});
</script>
