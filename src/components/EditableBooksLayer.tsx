"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { bookcaseLabelForKey, normalizeBookcaseKey } from "@/lib/bookcase/pageKey";
import {
  BOOKCASE_SHELF_NAV_PROFILE_KEYS,
  BOOKCASE_SHELF_NAV_PROFILE_LABELS,
  isBookcaseShelfNavProfileKey,
  type BookcaseShelfNavProfileKey,
} from "@/lib/bookcase/shelfNavDeviceLayout";

type BookItem = {
  key: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label: string;
  targetPath: string;
  spineType: "gold" | "brown";
  titleFont: "classic" | "story" | "elegant" | "script";
  titleSizeVw: number;
  titleColor: "brown" | "black";
  titleBoxXPercent: number;
  titleBoxYPercent: number;
  titleBoxWidthPercent: number;
  titleBoxHeightPercent: number;
  coverImageUrl: string;
  readerSampleText: string;
  infoPageText: string;
  readerSampleMediaUrl: string;
  readerSampleMediaType: string;
  infoPageMediaUrl: string;
  infoPageMediaType: string;
  fullBookMediaUrl: string;
  fullBookMediaType: string;
  fullBookHideFirstPages: number;
  fullBookMaxPages: number;
};

type TargetPathOption = {
  value: string;
  label: string;
};

type FrontTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  coverWindow: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
  actionButtons: {
    sample: FrontActionTemplate;
    info: FrontActionTemplate;
  };
};

type AdminLogoTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type FrontTemplates = {
  gold: FrontTemplate;
  brown: FrontTemplate;
  adminLogo: AdminLogoTemplate;
};

type Layout = {
  books: BookItem[];
  frontTemplates: FrontTemplates;
};
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type FrontActionSlot = "sample" | "info";
type ReaderSlot = "sample" | "info" | "full";

type FrontActionTemplate = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type Interaction = {
  mode: "move" | "resize";
  key: string;
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startBook: BookItem;
};

type PanelInteraction = {
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

type TitleBoxInteraction = {
  mode: "move" | "resize";
  key: string;
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  bookRect: {
    width: number;
    height: number;
  };
};

type FrontInteraction = {
  mode: "move" | "resize";
  templateType: "gold" | "brown";
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startFront: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type CoverWindowInteraction = {
  mode: "move" | "resize";
  templateType: "gold" | "brown";
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startWindow: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frameRect: {
    width: number;
    height: number;
  };
};

type FrontActionInteraction = {
  mode: "move" | "resize";
  templateType: "gold" | "brown";
  slot: FrontActionSlot;
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startAction: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  frameRect: {
    width: number;
    height: number;
  };
};

type AdminLogoInteraction = {
  mode: "move" | "resize";
  corner?: ResizeCorner;
  startClientX: number;
  startClientY: number;
  startLogo: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  canvasRect: {
    width: number;
    height: number;
  };
};

type NavDragState = {
  target: "back" | "next";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  startBackX: number;
  startBackY: number;
  startNextX: number;
  startNextY: number;
};

type Props = {
  pageKey: string;
  isAdmin: boolean;
};

type ShelfNavApiResult = {
  profile?: BookcaseShelfNavProfileKey;
  vars?: Record<string, string>;
  source?: string;
  warning?: string;
  error?: string;
};

type BookLayoutApiResult = {
  profile?: BookcaseShelfNavProfileKey;
  layout?: {
    books?: unknown;
    frontTemplates?: unknown;
  };
  source?: string;
  warning?: string;
  error?: string;
};

type FrontViewport = {
  aspect: number;
  stageWidthPercent: number;
  stageHeightPercent: number;
  stageLeftPercent: number;
  stageTopPercent: number;
  backgroundColor: string;
};

const MIN_WIDTH_PERCENT = 4;
const MIN_HEIGHT_PERCENT = 8;
const MAX_WIDTH_PERCENT = 40;
const MAX_HEIGHT_PERCENT = 82;
const MAX_BOOKS = 8;
const PRESET_BOOK_WIDTH = 14.67;
const PRESET_BOOK_HEIGHT = 73.59;
const MIN_TITLE_BOX_WIDTH = 20;
const MIN_TITLE_BOX_HEIGHT = 6;
const MIN_FRONT_WIDTH = 16;
const MIN_FRONT_HEIGHT = 26;
const MIN_COVER_WINDOW_WIDTH = 16;
const MIN_COVER_WINDOW_HEIGHT = 20;
const MAX_COVER_WINDOW_PERCENT = 100;
const MIN_ACTION_WIDTH_PERCENT = 10;
const MIN_ACTION_HEIGHT_PERCENT = 4;
const MAX_ACTION_WIDTH_PERCENT = 52;
const MAX_ACTION_HEIGHT_PERCENT = 26;
const MIN_ADMIN_LOGO_WIDTH_PERCENT = 5;
const MIN_ADMIN_LOGO_HEIGHT_PERCENT = 5;
const MAX_ADMIN_LOGO_WIDTH_PERCENT = 30;
const MAX_ADMIN_LOGO_HEIGHT_PERCENT = 30;
const DEFAULT_COVER_WINDOW_HEIGHT = 92;
const LEGACY_COVER_WINDOW_WIDTH = 70;
const LEGACY_COVER_WINDOW_HEIGHT = 77;
const DEFAULT_COVER_WINDOW = {
  xPercent: 50,
  yPercent: 50,
  widthPercent: MAX_COVER_WINDOW_PERCENT,
  heightPercent: DEFAULT_COVER_WINDOW_HEIGHT,
} as const;
const DEFAULT_SAMPLE_ACTION = {
  xPercent: 32,
  yPercent: 88,
  widthPercent: 28,
  heightPercent: 8,
} as const;
const DEFAULT_INFO_ACTION = {
  xPercent: 68,
  yPercent: 88,
  widthPercent: 28,
  heightPercent: 8,
} as const;
const DEFAULT_ADMIN_LOGO = {
  xPercent: 50,
  yPercent: 90,
  widthPercent: 10,
  heightPercent: 10,
} as const;
const EDITOR_WIDTH = 220;
const EDITOR_HEIGHT = 360;
const EDITOR_MARGIN = 6;
const BASE_TARGET_PATH_OPTIONS: TargetPathOption[] = [
  { value: "/bookcase", label: "Bookcase Home" },
  { value: "/bookcase/creating", label: "Bookcase: Books I'm creating" },
  { value: "/bookcase/recommended", label: "Bookcase: Recommended" },
  { value: "/bookcase/inner", label: "Bookcase: Inner" },
];

const TITLE_FONT_OPTIONS: Array<{ value: BookItem["titleFont"]; label: string; fontFamily: string }> = [
  { value: "classic", label: "Classic", fontFamily: "Georgia, 'Times New Roman', serif" },
  { value: "story", label: "Story", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { value: "elegant", label: "Elegant", fontFamily: "Garamond, Baskerville, 'Times New Roman', serif" },
  { value: "script", label: "Script", fontFamily: "'Brush Script MT', 'Segoe Script', cursive" },
];

function fontFamilyFor(value: BookItem["titleFont"]) {
  return TITLE_FONT_OPTIONS.find((item) => item.value === value)?.fontFamily ?? TITLE_FONT_OPTIONS[0].fontFamily;
}

function titleColorValue(value: BookItem["titleColor"]) {
  return value === "black" ? "#181513" : "#3b2618";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePercent(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function toPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function frontTemplateAspect(template: FrontTemplate) {
  const width = template.widthPercent;
  const height = template.heightPercent;
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) return 1;
  return Number(((width * 16) / (height * 9)).toFixed(4));
}

function frontViewport(frontType: "gold" | "brown", aspect: number): FrontViewport {
  // Gold front artwork includes a transparent "left page" strip.
  // Compensate in both edit and preview rendering so coordinates match visually.
  const cropLeftPercent = frontType === "gold" ? 36.2 : 0;
  const cropRightPercent = frontType === "gold" ? 0.8 : 0;
  const cropTopPercent = frontType === "gold" ? 1.4 : 0;
  const cropBottomPercent = frontType === "gold" ? 1.4 : 0;
  const bleedXPercent = frontType === "gold" ? 0.2 : 1.2;
  const bleedYPercent = frontType === "gold" ? 0.2 : 1.2;
  const usableWidthPercent = clamp(100 - cropLeftPercent - cropRightPercent, 1, 100);
  const usableHeightPercent = clamp(100 - cropTopPercent - cropBottomPercent, 1, 100);
  const usableRatio = usableWidthPercent / 100;

  const baseStageWidthPercent = 100 / usableRatio;
  const stageWidthPercent = Number((baseStageWidthPercent + bleedXPercent).toFixed(4));
  const stageLeftPercent = Number((-(cropLeftPercent / usableWidthPercent) * 100 - bleedXPercent / 2).toFixed(4));
  const baseStageHeightPercent = 100 / (usableHeightPercent / 100);
  const stageHeightPercent = Number((baseStageHeightPercent + bleedYPercent).toFixed(4));
  const stageTopPercent = Number((-(cropTopPercent / usableHeightPercent) * 100 - bleedYPercent / 2).toFixed(4));

  return {
    aspect: Number((aspect * usableRatio).toFixed(4)),
    stageWidthPercent,
    stageHeightPercent,
    stageLeftPercent,
    stageTopPercent,
    backgroundColor: frontType === "gold" ? "#f2e4be" : "#5a3a25",
  };
}

function defaultBooks(pageKey: string): BookItem[] {
  return [];
}

function defaultTargetPath(pageKey: string) {
  return "/bookcase";
}

function targetPathOptions(currentPath: string, baseOptions: TargetPathOption[]): TargetPathOption[] {
  if (!currentPath || baseOptions.some((option) => option.value === currentPath)) {
    return baseOptions;
  }
  return [{ value: currentPath, label: `Custom: ${currentPath}` }, ...baseOptions];
}

function defaultBookByIndex(pageKey: string, index: number): BookItem {
  const slot = clamp(index, 0, MAX_BOOKS - 1);
  const halfWidth = PRESET_BOOK_WIDTH / 2;
  const minX = halfWidth;
  const maxX = 100 - halfWidth;
  const xStep = MAX_BOOKS > 1 ? (maxX - minX) / (MAX_BOOKS - 1) : 0;
  const x = minX + slot * xStep;
  const y = 63;

  return {
    key: `book-${index + 1}`,
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: PRESET_BOOK_WIDTH,
    heightPercent: PRESET_BOOK_HEIGHT,
    label: "",
    targetPath: defaultTargetPath(pageKey),
    spineType: index % 2 === 0 ? "gold" : "brown",
    titleFont: "classic",
    titleSizeVw: 1.6,
    titleColor: "brown",
    titleBoxXPercent: 50,
    titleBoxYPercent: 16,
    titleBoxWidthPercent: 46,
    titleBoxHeightPercent: 13,
    coverImageUrl: "",
    readerSampleText: "",
    infoPageText: "",
    readerSampleMediaUrl: "",
    readerSampleMediaType: "",
    infoPageMediaUrl: "",
    infoPageMediaType: "",
    fullBookMediaUrl: "",
    fullBookMediaType: "",
    fullBookHideFirstPages: 0,
    fullBookMaxPages: 0,
  };
}

function defaultFrontTemplate(): FrontTemplate {
  return {
    xPercent: 50,
    yPercent: 58,
    widthPercent: 34,
    heightPercent: 72,
    coverWindow: { ...DEFAULT_COVER_WINDOW },
    actionButtons: {
      sample: { ...DEFAULT_SAMPLE_ACTION },
      info: { ...DEFAULT_INFO_ACTION },
    },
  };
}

function normalizeCoverWindow(
  raw: unknown,
  fallback: FrontTemplate["coverWindow"]
): FrontTemplate["coverWindow"] {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_COVER_WINDOW_WIDTH, MAX_COVER_WINDOW_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_COVER_WINDOW_HEIGHT, MAX_COVER_WINDOW_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;
  const widthRounded = Number(width.toFixed(2));
  const heightRounded = Number(height.toFixed(2));
  const xRounded = Number(x.toFixed(2));
  const yRounded = Number(y.toFixed(2));
  const isLegacyDefault =
    Math.abs(widthRounded - LEGACY_COVER_WINDOW_WIDTH) <= 0.5 &&
    Math.abs(heightRounded - LEGACY_COVER_WINDOW_HEIGHT) <= 0.5;

  if (isLegacyDefault) {
    return { ...DEFAULT_COVER_WINDOW };
  }

  const rounded = {
    xPercent: xRounded,
    yPercent: yRounded,
    widthPercent: widthRounded,
    heightPercent: heightRounded,
  };

  if (
    Math.abs(rounded.xPercent - DEFAULT_COVER_WINDOW.xPercent) <= 0.01 &&
    Math.abs(rounded.yPercent - DEFAULT_COVER_WINDOW.yPercent) <= 0.01 &&
    Math.abs(rounded.widthPercent - DEFAULT_COVER_WINDOW.widthPercent) <= 0.01 &&
    Math.abs(rounded.heightPercent - DEFAULT_COVER_WINDOW.heightPercent) <= 0.01
  ) {
    return { ...DEFAULT_COVER_WINDOW };
  }

  return rounded;
}

function normalizeFrontAction(
  raw: unknown,
  fallback: FrontActionTemplate
): FrontActionTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_ACTION_WIDTH_PERCENT, MAX_ACTION_WIDTH_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_ACTION_HEIGHT_PERCENT, MAX_ACTION_HEIGHT_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
  };
}

function normalizeAdminLogo(raw: unknown, fallback: AdminLogoTemplate): AdminLogoTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw)
    ? clamp(widthRaw, MIN_ADMIN_LOGO_WIDTH_PERCENT, MAX_ADMIN_LOGO_WIDTH_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(heightRaw)
    ? clamp(heightRaw, MIN_ADMIN_LOGO_HEIGHT_PERCENT, MAX_ADMIN_LOGO_HEIGHT_PERCENT)
    : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
  };
}

function defaultFrontTemplates(): FrontTemplates {
  const base = defaultFrontTemplate();
  return {
    gold: { ...base },
    brown: { ...base },
    adminLogo: { ...DEFAULT_ADMIN_LOGO },
  };
}

function defaultLayout(pageKey: string): Layout {
  return { books: defaultBooks(pageKey), frontTemplates: defaultFrontTemplates() };
}

function normalizeBook(raw: unknown, fallback: BookItem): BookItem {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const keyRaw = typeof row.key === "string" ? row.key.trim() : fallback.key;
  const labelRaw = typeof row.label === "string" ? row.label : fallback.label;
  const targetRaw = typeof row.targetPath === "string" ? row.targetPath.trim() : fallback.targetPath;
  const spineRaw = row.spineType === "gold" || row.spineType === "brown" ? row.spineType : fallback.spineType;
  const titleFontRaw =
    row.titleFont === "classic" ||
    row.titleFont === "story" ||
    row.titleFont === "elegant" ||
    row.titleFont === "script"
      ? row.titleFont
      : fallback.titleFont;
  const titleSizeRaw = Number(row.titleSizeVw);
  const titleColorRaw = row.titleColor === "black" || row.titleColor === "brown" ? row.titleColor : fallback.titleColor;
  const titleBoxXRaw = Number(row.titleBoxXPercent);
  const titleBoxYRaw = Number(row.titleBoxYPercent);
  const titleBoxWidthRaw = Number(row.titleBoxWidthPercent);
  const titleBoxHeightRaw = Number(row.titleBoxHeightPercent);
  const coverImageUrlRaw = typeof row.coverImageUrl === "string" ? row.coverImageUrl.trim() : fallback.coverImageUrl;
  const readerSampleTextRaw =
    typeof row.readerSampleText === "string" ? row.readerSampleText : fallback.readerSampleText;
  const infoPageTextRaw = typeof row.infoPageText === "string" ? row.infoPageText : fallback.infoPageText;
  const readerSampleMediaUrlRaw =
    typeof row.readerSampleMediaUrl === "string" ? row.readerSampleMediaUrl.trim() : fallback.readerSampleMediaUrl;
  const readerSampleMediaTypeRaw =
    typeof row.readerSampleMediaType === "string"
      ? row.readerSampleMediaType.trim()
      : fallback.readerSampleMediaType;
  const infoPageMediaUrlRaw =
    typeof row.infoPageMediaUrl === "string" ? row.infoPageMediaUrl.trim() : fallback.infoPageMediaUrl;
  const infoPageMediaTypeRaw =
    typeof row.infoPageMediaType === "string" ? row.infoPageMediaType.trim() : fallback.infoPageMediaType;
  const fullBookMediaUrlRaw =
    typeof row.fullBookMediaUrl === "string" ? row.fullBookMediaUrl.trim() : fallback.fullBookMediaUrl;
  const fullBookMediaTypeRaw =
    typeof row.fullBookMediaType === "string" ? row.fullBookMediaType.trim() : fallback.fullBookMediaType;
  const fullBookHideFirstPagesRaw = Number(row.fullBookHideFirstPages);
  const fullBookMaxPagesRaw = Number(row.fullBookMaxPages);
  const normalizedLabel = isSlotPlaceholderLabel(labelRaw, keyRaw || fallback.key) ? "" : labelRaw;

  const width = Number.isFinite(Number(row.widthPercent))
    ? clamp(Number(row.widthPercent), MIN_WIDTH_PERCENT, MAX_WIDTH_PERCENT)
    : fallback.widthPercent;
  const height = Number.isFinite(Number(row.heightPercent))
    ? clamp(Number(row.heightPercent), MIN_HEIGHT_PERCENT, MAX_HEIGHT_PERCENT)
    : fallback.heightPercent;

  const x = Number.isFinite(Number(row.xPercent))
    ? clamp(Number(row.xPercent), width / 2, 100 - width / 2)
    : fallback.xPercent;
  const y = Number.isFinite(Number(row.yPercent))
    ? clamp(Number(row.yPercent), height / 2, 100 - height / 2)
    : fallback.yPercent;

  const titleBoxWidth = Number.isFinite(titleBoxWidthRaw)
    ? clamp(titleBoxWidthRaw, MIN_TITLE_BOX_WIDTH, 90)
    : fallback.titleBoxWidthPercent;
  const titleBoxHeight = Number.isFinite(titleBoxHeightRaw)
    ? clamp(titleBoxHeightRaw, MIN_TITLE_BOX_HEIGHT, 40)
    : fallback.titleBoxHeightPercent;
  const titleBoxX = Number.isFinite(titleBoxXRaw)
    ? clamp(titleBoxXRaw, titleBoxWidth / 2, 100 - titleBoxWidth / 2)
    : fallback.titleBoxXPercent;
  const titleBoxY = Number.isFinite(titleBoxYRaw)
    ? clamp(titleBoxYRaw, titleBoxHeight / 2, 100 - titleBoxHeight / 2)
    : fallback.titleBoxYPercent;

  return {
    key: keyRaw || fallback.key,
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
    label: normalizedLabel,
    targetPath: targetRaw.startsWith("/") ? targetRaw : fallback.targetPath,
    spineType: spineRaw,
    titleFont: titleFontRaw,
    titleSizeVw: Number.isFinite(titleSizeRaw) ? clamp(titleSizeRaw, 1.2, 3.8) : fallback.titleSizeVw,
    titleColor: titleColorRaw,
    titleBoxXPercent: Number(titleBoxX.toFixed(2)),
    titleBoxYPercent: Number(titleBoxY.toFixed(2)),
    titleBoxWidthPercent: Number(titleBoxWidth.toFixed(2)),
    titleBoxHeightPercent: Number(titleBoxHeight.toFixed(2)),
    coverImageUrl: coverImageUrlRaw,
    readerSampleText: readerSampleTextRaw,
    infoPageText: infoPageTextRaw,
    readerSampleMediaUrl: readerSampleMediaUrlRaw,
    readerSampleMediaType: readerSampleMediaTypeRaw,
    infoPageMediaUrl: infoPageMediaUrlRaw,
    infoPageMediaType: infoPageMediaTypeRaw,
    fullBookMediaUrl: fullBookMediaUrlRaw,
    fullBookMediaType: fullBookMediaTypeRaw,
    fullBookHideFirstPages: Number.isFinite(fullBookHideFirstPagesRaw)
      ? clamp(Math.round(fullBookHideFirstPagesRaw), 0, 5000)
      : fallback.fullBookHideFirstPages,
    fullBookMaxPages: Number.isFinite(fullBookMaxPagesRaw) ? clamp(Math.round(fullBookMaxPagesRaw), 0, 5000) : fallback.fullBookMaxPages,
  };
}

function normalizeFrontTemplate(raw: unknown, fallback: FrontTemplate): FrontTemplate {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const actionButtonsRow =
    row.actionButtons && typeof row.actionButtons === "object"
      ? (row.actionButtons as Record<string, unknown>)
      : {};
  const widthRaw = Number(row.widthPercent);
  const heightRaw = Number(row.heightPercent);
  const xRaw = Number(row.xPercent);
  const yRaw = Number(row.yPercent);

  const width = Number.isFinite(widthRaw) ? clamp(widthRaw, MIN_FRONT_WIDTH, 92) : fallback.widthPercent;
  const height = Number.isFinite(heightRaw) ? clamp(heightRaw, MIN_FRONT_HEIGHT, 96) : fallback.heightPercent;
  const x = Number.isFinite(xRaw) ? clamp(xRaw, width / 2, 100 - width / 2) : fallback.xPercent;
  const y = Number.isFinite(yRaw) ? clamp(yRaw, height / 2, 100 - height / 2) : fallback.yPercent;

  return {
    xPercent: Number(x.toFixed(2)),
    yPercent: Number(y.toFixed(2)),
    widthPercent: Number(width.toFixed(2)),
    heightPercent: Number(height.toFixed(2)),
    coverWindow: normalizeCoverWindow(row.coverWindow, fallback.coverWindow),
    actionButtons: {
      sample: normalizeFrontAction(actionButtonsRow.sample, fallback.actionButtons.sample),
      info: normalizeFrontAction(actionButtonsRow.info, fallback.actionButtons.info),
    },
  };
}

function normalizeFrontTemplates(raw: unknown): FrontTemplates {
  const defaults = defaultFrontTemplates();
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    gold: normalizeFrontTemplate(row.gold, defaults.gold),
    brown: normalizeFrontTemplate(row.brown, defaults.brown),
    adminLogo: normalizeAdminLogo(row.adminLogo, defaults.adminLogo),
  };
}

function normalizeLayout(raw: unknown, pageKey: string): Layout {
  if (!raw || typeof raw !== "object") {
    return { books: [], frontTemplates: defaultFrontTemplates() };
  }

  const row = raw as Record<string, unknown>;
  const rawBooks = Array.isArray(row.books) ? row.books : [];
  if (rawBooks.length === 0) {
    return { books: [], frontTemplates: normalizeFrontTemplates(row.frontTemplates) };
  }

  const normalized = rawBooks
    .slice(0, MAX_BOOKS)
    .map((item, index) => normalizeBook(item, defaultBookByIndex(pageKey, index)));

  return { books: normalized, frontTemplates: normalizeFrontTemplates(row.frontTemplates) };
}

function nextBookKey(books: BookItem[]) {
  let next = books.length + 1;
  let candidate = `book-${next}`;
  const keys = new Set(books.map((item) => item.key));
  while (keys.has(candidate)) {
    next += 1;
    candidate = `book-${next}`;
  }
  return candidate;
}

function hasDisplayTitle(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return false;
  return !/^#?\d+$/.test(trimmed);
}

function hasReaderContent(book: BookItem, slot: ReaderSlot) {
  if (slot === "sample") {
    return Boolean(book.readerSampleText.trim() || book.readerSampleMediaUrl.trim());
  }
  if (slot === "full") {
    return Boolean(book.fullBookMediaUrl.trim());
  }
  return Boolean(book.infoPageText.trim() || book.infoPageMediaUrl.trim());
}

function readerPath(pageKey: string, bookKey: string, slot: ReaderSlot) {
  const safePageKey = encodeURIComponent(pageKey);
  const safeBookKey = encodeURIComponent(bookKey);
  return `/reader/book/${safePageKey}/${safeBookKey}?slot=${slot}`;
}

function actionLogoPath(frontType: "gold" | "brown", slot: FrontActionSlot) {
  // Use opposite-tone badges for contrast:
  // gold front => brown badges, brown front => gold badges.
  if (frontType === "gold" && slot === "sample") return "/reader-sample-brown-tight.png";
  if (frontType === "gold" && slot === "info") return "/information-page-brown-tight.png";
  if (frontType === "brown" && slot === "sample") return "/reader-sample-gold-tight.png";
  return "/information-page-gold-tight-brighter.png";
}

function isSlotPlaceholderLabel(label: string, key: string) {
  const trimmed = label.trim();
  if (!trimmed) return false;

  const keyMatch = key.match(/book-(\d+)$/i);
  if (!keyMatch) return false;

  const slotNumber = keyMatch[1];
  return trimmed === slotNumber || trimmed === `#${slotNumber}`;
}

export default function EditableBooksLayer({ pageKey, isAdmin }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editMode = isAdmin && searchParams.get("edit") === "1";
  const previewProfile = searchParams.get("previewProfile");
  const forcedNavProfile = isBookcaseShelfNavProfileKey(previewProfile || "")
    ? (previewProfile as BookcaseShelfNavProfileKey)
    : null;
  const canvasRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const panelInteractionRef = useRef<PanelInteraction | null>(null);
  const titleBoxInteractionRef = useRef<TitleBoxInteraction | null>(null);
  const frontInteractionRef = useRef<FrontInteraction | null>(null);
  const coverWindowInteractionRef = useRef<CoverWindowInteraction | null>(null);
  const frontActionInteractionRef = useRef<FrontActionInteraction | null>(null);
  const adminLogoInteractionRef = useRef<AdminLogoInteraction | null>(null);
  const navDragRef = useRef<NavDragState | null>(null);
  const scenePanRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);

  const [layout, setLayout] = useState<Layout>(() => defaultLayout(pageKey));
  const [draft, setDraft] = useState<Layout>(() => defaultLayout(pageKey));
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [activeKey, setActiveKey] = useState<string>("");
  const [editorFormPage, setEditorFormPage] = useState<1 | 2 | 3>(1);
  const [editorPos, setEditorPos] = useState({ x: EDITOR_MARGIN, y: 16 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingBookKey, setPendingBookKey] = useState<string>("");
  const [showAddBookcaseModal, setShowAddBookcaseModal] = useState(false);
  const [pendingBookcaseKey, setPendingBookcaseKey] = useState("");
  const [creatingBookcase, setCreatingBookcase] = useState(false);
  const [bookcasePathOptions, setBookcasePathOptions] = useState<TargetPathOption[]>([]);
  const [selectedBookForPreview, setSelectedBookForPreview] = useState<string>("");
  const [previewAnchorRect, setPreviewAnchorRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [showFrontTemplate, setShowFrontTemplate] = useState(true);
  const [showBackTemplate, setShowBackTemplate] = useState(true);
  const [navProfile, setNavProfile] = useState<BookcaseShelfNavProfileKey>("desktop");
  const [navVars, setNavVars] = useState<Record<string, string>>({});
  const [navLoading, setNavLoading] = useState(false);
  const [navSaving, setNavSaving] = useState(false);
  const [navStatus, setNavStatus] = useState<string | null>(null);
  const [navReloadToken, setNavReloadToken] = useState(0);

  const activeBook = useMemo(() => {
    if (draft.books.length === 0) return null;
    return draft.books.find((item) => item.key === activeKey) ?? draft.books[0];
  }, [activeKey, draft.books]);

  const pendingBook = useMemo(() => {
    if (!pendingBookKey) return null;
    return draft.books.find((item) => item.key === pendingBookKey) ?? null;
  }, [draft.books, pendingBookKey]);

  const navBackX = parsePercent(navVars["--bookcase-nav-back-x"], 10);
  const navBackY = parsePercent(navVars["--bookcase-nav-back-y"], 7);
  const navNextX = parsePercent(navVars["--bookcase-nav-next-x"], 90);
  const navNextY = parsePercent(navVars["--bookcase-nav-next-y"], 7);
  const navWidth = parsePercent(navVars["--bookcase-nav-width"], 16);

  const safeNavBackX = clamp(navBackX, 0, 100);
  const safeNavBackY = clamp(navBackY, 0, 100);
  const safeNavNextX = clamp(navNextX, 0, 100);
  const safeNavNextY = clamp(navNextY, 0, 100);
  const safeNavWidth = clamp(navWidth, 6, 40);

  const allTargetPathOptions = useMemo(() => {
    const merged = [...BASE_TARGET_PATH_OPTIONS];
    for (const option of bookcasePathOptions) {
      if (!merged.some((item) => item.value === option.value)) {
        merged.push(option);
      }
    }
    return merged;
  }, [bookcasePathOptions]);

  const suggestedNextBookcaseKey = useMemo(() => {
    const base = normalizeBookcaseKey(pageKey);
    if (!base) return "";

    let maxNumeric = 1;
    for (const option of bookcasePathOptions) {
      const value = option.value || "";
      const keyPart = value.startsWith("/bookcase/") ? value.slice("/bookcase/".length) : "";
      const key = normalizeBookcaseKey(decodeURIComponent(keyPart));
      if (!key || (key !== base && !key.startsWith(`${base}-`))) continue;

      if (key === base) {
        maxNumeric = Math.max(maxNumeric, 1);
        continue;
      }

      const suffix = key.slice(base.length + 1);
      if (/^\d+$/.test(suffix)) {
        maxNumeric = Math.max(maxNumeric, Number(suffix));
      }
    }

    return `${base}-${maxNumeric + 1}`;
  }, [bookcasePathOptions, pageKey]);
  const activeTargetPathOptions = useMemo(
    () => targetPathOptions(activeBook?.targetPath || "", allTargetPathOptions),
    [activeBook?.targetPath, allTargetPathOptions]
  );
  const pendingTargetPathOptions = useMemo(
    () => targetPathOptions(pendingBook?.targetPath || "", allTargetPathOptions),
    [pendingBook?.targetPath, allTargetPathOptions]
  );

  const selectedPreviewBook = useMemo(() => {
    if (!selectedBookForPreview) return null;
    return draft.books.find((item) => item.key === selectedBookForPreview) ?? null;
  }, [draft.books, selectedBookForPreview]);
  const activeFrontType: "gold" | "brown" = activeBook?.spineType ?? "gold";
  const previewFrontType: "gold" | "brown" = selectedPreviewBook?.spineType ?? "gold";
  const activeFrontTemplate = draft.frontTemplates[activeFrontType];
  const previewFrontTemplate = draft.frontTemplates[previewFrontType];
  const adminLogoTemplate = draft.frontTemplates.adminLogo;
  const activeViewport = useMemo(
    () => frontViewport(activeFrontType, frontTemplateAspect(activeFrontTemplate)),
    [activeFrontTemplate, activeFrontType]
  );
  const previewViewport = useMemo(
    () => frontViewport(previewFrontType, frontTemplateAspect(previewFrontTemplate)),
    [previewFrontTemplate, previewFrontType]
  );

  const coverPreviewRect = useMemo(() => {
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720;
    const baseWidth = previewAnchorRect
      ? (previewAnchorRect.width * previewFrontTemplate.widthPercent) / 100
      : viewportWidth * 0.34;
    const baseHeight = previewAnchorRect
      ? (previewAnchorRect.height * previewFrontTemplate.heightPercent) / 100
      : viewportHeight * 0.72;
    const maxWidth = viewportWidth * 0.9;
    const maxHeight = viewportHeight * 0.86;
    const scale = Math.min(1, maxWidth / Math.max(baseWidth, 1), maxHeight / Math.max(baseHeight, 1));
    return {
      width: Math.max(220, baseWidth * scale),
      height: Math.max(260, baseHeight * scale),
    };
  }, [
    previewAnchorRect,
    previewFrontTemplate.heightPercent,
    previewFrontTemplate.widthPercent,
  ]);

  useEffect(() => {
    if (!selectedBookForPreview) {
      setPreviewAnchorRect(null);
      return;
    }

    function updatePreviewAnchorRect() {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPreviewAnchorRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    updatePreviewAnchorRect();
    window.addEventListener("resize", updatePreviewAnchorRect);
    window.addEventListener("scroll", updatePreviewAnchorRect, true);
    return () => {
      window.removeEventListener("resize", updatePreviewAnchorRect);
      window.removeEventListener("scroll", updatePreviewAnchorRect, true);
    };
  }, [selectedBookForPreview]);

  useEffect(() => {
    setEditorPos((prev) => {
      const topMargin = 16;
      const maxX = Math.max(EDITOR_MARGIN, window.innerWidth - EDITOR_WIDTH - EDITOR_MARGIN);
      const maxY = Math.max(topMargin, window.innerHeight - EDITOR_HEIGHT - topMargin);
      const clampedX = clamp(prev.x, EDITOR_MARGIN, maxX);
      const clampedY = clamp(prev.y, topMargin, maxY);
      if (clampedX === prev.x && clampedY === prev.y) {
        return prev;
      }
      return { x: clampedX, y: clampedY };
    });
  }, []);

  useEffect(() => {
    const phonePortraitQuery = window.matchMedia("(max-width: 680px) and (orientation: portrait)");
    const phoneLandscapeQuery = window.matchMedia("(max-height: 500px) and (orientation: landscape)");
    const ipadPortraitQuery = window.matchMedia("(max-width: 1024px) and (orientation: portrait)");
    const ipadLandscapeQuery = window.matchMedia(
      "(max-width: 1366px) and (orientation: landscape) and (pointer: coarse)"
    );

    function addMediaChangeListener(query: MediaQueryList, listener: () => void) {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
        return () => query.removeEventListener("change", listener);
      }
      query.addListener(listener);
      return () => query.removeListener(listener);
    }

    const syncProfile = () => {
      if (forcedNavProfile) {
        setNavProfile(forcedNavProfile);
        return;
      }

      let nextProfile: BookcaseShelfNavProfileKey = "desktop";
      if (phonePortraitQuery.matches) {
        const portraitWidth = Math.max(window.innerWidth || 0, Math.round(window.visualViewport?.width || 0));
        nextProfile = portraitWidth >= 420 ? "iphone-portrait-max" : "iphone-portrait";
      } else if (phoneLandscapeQuery.matches) {
        const landscapeHeight = Math.max(window.innerHeight || 0, Math.round(window.visualViewport?.height || 0));
        nextProfile = landscapeHeight >= 410 ? "iphone-landscape-max" : "iphone-landscape";
      } else if (ipadPortraitQuery.matches) {
        nextProfile = "ipad-portrait";
      } else if (ipadLandscapeQuery.matches) {
        nextProfile = "ipad-landscape";
      }

      setNavProfile(nextProfile);
    };

    syncProfile();

    if (!forcedNavProfile) {
      const removePhonePortrait = addMediaChangeListener(phonePortraitQuery, syncProfile);
      const removePhoneLandscape = addMediaChangeListener(phoneLandscapeQuery, syncProfile);
      const removeIpadPortrait = addMediaChangeListener(ipadPortraitQuery, syncProfile);
      const removeIpadLandscape = addMediaChangeListener(ipadLandscapeQuery, syncProfile);
      window.addEventListener("resize", syncProfile);
      window.addEventListener("orientationchange", syncProfile);
      return () => {
        removePhonePortrait();
        removePhoneLandscape();
        removeIpadPortrait();
        removeIpadLandscape();
        window.removeEventListener("resize", syncProfile);
        window.removeEventListener("orientationchange", syncProfile);
      };
    }
    return undefined;
  }, [forcedNavProfile]);

  useEffect(() => {
    let cancelled = false;

    async function loadNavLayout() {
      setNavLoading(true);
      setNavStatus(null);
      try {
        const response = await fetch(`/api/bookcase-shelf-nav-layout?profile=${navProfile}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ShelfNavApiResult;
        if (!response.ok) {
          throw new Error(payload.error || "Unable to load arrow layout.");
        }
        if (cancelled) return;
        setNavVars(payload.vars || {});
        if (payload.warning) {
          setNavStatus(`Loaded defaults (${payload.warning}).`);
        } else if (payload.source === "supabase") {
          setNavStatus("Arrow layout loaded.");
        } else {
          setNavStatus("Arrow defaults loaded.");
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to load arrow layout.";
        setNavStatus(message);
      } finally {
        if (!cancelled) setNavLoading(false);
      }
    }

    void loadNavLayout();
    return () => {
      cancelled = true;
    };
  }, [navProfile, navReloadToken]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (Math.abs(navBackX - safeNavBackX) > 0.01) next["--bookcase-nav-back-x"] = toPercent(safeNavBackX);
    if (Math.abs(navBackY - safeNavBackY) > 0.01) next["--bookcase-nav-back-y"] = toPercent(safeNavBackY);
    if (Math.abs(navNextX - safeNavNextX) > 0.01) next["--bookcase-nav-next-x"] = toPercent(safeNavNextX);
    if (Math.abs(navNextY - safeNavNextY) > 0.01) next["--bookcase-nav-next-y"] = toPercent(safeNavNextY);
    if (Math.abs(navWidth - safeNavWidth) > 0.01) next["--bookcase-nav-width"] = toPercent(safeNavWidth);

    if (Object.keys(next).length > 0) {
      setNavVars((current) => ({ ...current, ...next }));
    }
  }, [navBackX, navBackY, navNextX, navNextY, navWidth, safeNavBackX, safeNavBackY, safeNavNextX, safeNavNextY, safeNavWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = canvas?.closest(".bookcase-scene.bookcase-scene-empty");
    const back = scene?.querySelector(".bookcase-nav-sign-back") as HTMLAnchorElement | null;
    const next = scene?.querySelector(".bookcase-nav-sign-next") as HTMLAnchorElement | null;

    if (!scene || !back || !next) return;

    const applyNavStyle = (node: HTMLAnchorElement, x: number, y: number) => {
      node.style.position = "absolute";
      node.style.left = `${x}%`;
      node.style.right = "auto";
      node.style.top = `${y}%`;
      node.style.width = `${safeNavWidth}vw`;
      node.style.maxWidth = "none";
      node.style.transform = "translate(-50%, -50%)";
      node.style.zIndex = "45";
      node.style.opacity = "1";
      node.style.visibility = "visible";
      node.style.pointerEvents = editMode ? "none" : "auto";
      node.setAttribute("draggable", "false");
      node.ondragstart = (event) => {
        event.preventDefault();
      };
    };

    applyNavStyle(back, safeNavBackX, safeNavBackY);
    applyNavStyle(next, safeNavNextX, safeNavNextY);
  }, [editMode, safeNavBackX, safeNavBackY, safeNavNextX, safeNavNextY, safeNavWidth, pageKey]);

  useEffect(() => {
    const scene = canvasRef.current?.closest(".bookcase-scene.bookcase-scene-empty") as HTMLElement | null;
    if (!scene) return;
    scene.setAttribute("data-books-edit", editMode ? "1" : "0");
    return () => {
      scene.removeAttribute("data-books-edit");
    };
  }, [editMode, pageKey]);

  useEffect(() => {
    if (editMode) return;

    const scene = canvasRef.current?.closest(".bookcase-scene.bookcase-scene-empty") as HTMLElement | null;
    if (!scene) return;
    const sceneElement = scene;

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;
      scenePanRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollLeft: sceneElement.scrollLeft,
        moved: false,
      };
    }

    function onTouchMove(event: TouchEvent) {
      const state = scenePanRef.current;
      if (!state || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      sceneElement.scrollLeft = state.startScrollLeft - deltaX;
      state.moved = true;
      event.preventDefault();
    }

    function onTouchEnd() {
      scenePanRef.current = null;
    }

    sceneElement.addEventListener("touchstart", onTouchStart, { passive: true });
    sceneElement.addEventListener("touchmove", onTouchMove, { passive: false });
    sceneElement.addEventListener("touchend", onTouchEnd);
    sceneElement.addEventListener("touchcancel", onTouchEnd);

    return () => {
      sceneElement.removeEventListener("touchstart", onTouchStart);
      sceneElement.removeEventListener("touchmove", onTouchMove);
      sceneElement.removeEventListener("touchend", onTouchEnd);
      sceneElement.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [editMode, pageKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadBookcaseOptions() {
      try {
        const response = await fetch(`/api/bookcase-pages?ts=${Date.now()}`, { cache: "no-store" });
        const data: unknown = await response.json();
        const pages =
          data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).pages)
            ? ((data as Record<string, unknown>).pages as Array<Record<string, unknown>>)
            : [];
        const options = pages
          .map((page) => {
            const path = typeof page.path === "string" ? page.path : "";
            const label = typeof page.label === "string" ? page.label : "";
            if (!path.startsWith("/bookcase/")) return null;
            return { value: path, label: `Bookcase: ${label || path}` };
          })
          .filter((value): value is TargetPathOption => Boolean(value));
        if (!cancelled) {
          setBookcasePathOptions(options);
        }
      } catch {
        if (!cancelled) setBookcasePathOptions([]);
      }
    }

    void loadBookcaseOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const fallback = defaultLayout(pageKey);
    setLayout(fallback);
    setDraft(fallback);
    setActiveKey("");
    setLoading(true);

    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/bookcase-book-layout?page=${pageKey}&profile=${navProfile}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as BookLayoutApiResult;
        const normalized = normalizeLayout(
          data && typeof data === "object" ? (data.layout as unknown) : null,
          pageKey
        );

        if (!cancelled) {
          setLayout(normalized);
          setDraft(normalized);
          setActiveKey(normalized.books[0]?.key ?? "");
          if (data.warning) {
            setStatus(`Loaded ${BOOKCASE_SHELF_NAV_PROFILE_LABELS[navProfile]} with fallback values.`);
          }
        }
      } catch {
        if (!cancelled) setStatus("Using default book layout.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navProfile, pageKey]);

  useEffect(() => {
    setEditorFormPage(1);
  }, [activeKey]);

  useEffect(() => {
    function applyNavDrag(clientX: number, clientY: number) {
      const navCurrent = navDragRef.current;
      if (!navCurrent) return false;

      const deltaXPercent = ((clientX - navCurrent.startClientX) / Math.max(navCurrent.canvasWidth, 1)) * 100;
      const deltaYPercent = ((clientY - navCurrent.startClientY) / Math.max(navCurrent.canvasHeight, 1)) * 100;

      if (navCurrent.target === "back") {
        setNavVars((prev) => ({
          ...prev,
          "--bookcase-nav-back-x": toPercent(clamp(navCurrent.startBackX + deltaXPercent, 0, 100)),
          "--bookcase-nav-back-y": toPercent(clamp(navCurrent.startBackY + deltaYPercent, 0, 100)),
        }));
      } else {
        setNavVars((prev) => ({
          ...prev,
          "--bookcase-nav-next-x": toPercent(clamp(navCurrent.startNextX + deltaXPercent, 0, 100)),
          "--bookcase-nav-next-y": toPercent(clamp(navCurrent.startNextY + deltaYPercent, 0, 100)),
        }));
      }
      return true;
    }

    function onPointerMove(event: globalThis.PointerEvent) {
      if (!editMode) return;

      const panel = panelInteractionRef.current;
      if (panel) {
        const panelWidth = EDITOR_WIDTH;
        const panelHeight = EDITOR_HEIGHT;
        const topMargin = 16;
        const maxX = Math.max(EDITOR_MARGIN, window.innerWidth - panelWidth - EDITOR_MARGIN);
        const maxY = Math.max(topMargin, window.innerHeight - panelHeight - topMargin);
        const nextX = clamp(
          panel.startX + (event.clientX - panel.startClientX),
          EDITOR_MARGIN,
          maxX
        );
        const nextY = clamp(
          panel.startY + (event.clientY - panel.startClientY),
          topMargin,
          maxY
        );
        setEditorPos({ x: Math.round(nextX), y: Math.round(nextY) });
      }

      if (applyNavDrag(event.clientX, event.clientY)) {
        return;
      }

      const current = interactionRef.current;
      const titleBoxCurrent = titleBoxInteractionRef.current;
      const frontCurrent = frontInteractionRef.current;
      const coverWindowCurrent = coverWindowInteractionRef.current;
      const frontActionCurrent = frontActionInteractionRef.current;
      const adminLogoCurrent = adminLogoInteractionRef.current;
      if (adminLogoCurrent) {
        const dxPercent = ((event.clientX - adminLogoCurrent.startClientX) / adminLogoCurrent.canvasRect.width) * 100;
        const dyPercent = ((event.clientY - adminLogoCurrent.startClientY) / adminLogoCurrent.canvasRect.height) * 100;

        setDraft((prev) => {
          let width = adminLogoCurrent.startLogo.width;
          let height = adminLogoCurrent.startLogo.height;
          let x = adminLogoCurrent.startLogo.x;
          let y = adminLogoCurrent.startLogo.y;

          if (adminLogoCurrent.mode === "move") {
            x = adminLogoCurrent.startLogo.x + dxPercent;
            y = adminLogoCurrent.startLogo.y + dyPercent;
          } else {
            const corner = adminLogoCurrent.corner ?? "se";
            if (corner === "se") {
              width = adminLogoCurrent.startLogo.width + dxPercent;
              height = adminLogoCurrent.startLogo.height + dyPercent;
              x = adminLogoCurrent.startLogo.x + dxPercent / 2;
              y = adminLogoCurrent.startLogo.y + dyPercent / 2;
            }
            if (corner === "sw") {
              width = adminLogoCurrent.startLogo.width - dxPercent;
              height = adminLogoCurrent.startLogo.height + dyPercent;
              x = adminLogoCurrent.startLogo.x + dxPercent / 2;
              y = adminLogoCurrent.startLogo.y + dyPercent / 2;
            }
            if (corner === "ne") {
              width = adminLogoCurrent.startLogo.width + dxPercent;
              height = adminLogoCurrent.startLogo.height - dyPercent;
              x = adminLogoCurrent.startLogo.x + dxPercent / 2;
              y = adminLogoCurrent.startLogo.y + dyPercent / 2;
            }
            if (corner === "nw") {
              width = adminLogoCurrent.startLogo.width - dxPercent;
              height = adminLogoCurrent.startLogo.height - dyPercent;
              x = adminLogoCurrent.startLogo.x + dxPercent / 2;
              y = adminLogoCurrent.startLogo.y + dyPercent / 2;
            }
          }

          const clampedWidth = clamp(width, MIN_ADMIN_LOGO_WIDTH_PERCENT, MAX_ADMIN_LOGO_WIDTH_PERCENT);
          const clampedHeight = clamp(height, MIN_ADMIN_LOGO_HEIGHT_PERCENT, MAX_ADMIN_LOGO_HEIGHT_PERCENT);
          const clampedX = clamp(x, clampedWidth / 2, 100 - clampedWidth / 2);
          const clampedY = clamp(y, clampedHeight / 2, 100 - clampedHeight / 2);

          return {
            books: prev.books,
            frontTemplates: {
              ...prev.frontTemplates,
              adminLogo: normalizeAdminLogo(
                {
                  xPercent: clampedX,
                  yPercent: clampedY,
                  widthPercent: clampedWidth,
                  heightPercent: clampedHeight,
                },
                prev.frontTemplates.adminLogo
              ),
            },
          };
        });

        return;
      }
      if (frontActionCurrent) {
        const dxPercent = ((event.clientX - frontActionCurrent.startClientX) / frontActionCurrent.frameRect.width) * 100;
        const dyPercent = ((event.clientY - frontActionCurrent.startClientY) / frontActionCurrent.frameRect.height) * 100;

        setDraft((prev) => {
          const currentTemplate = prev.frontTemplates[frontActionCurrent.templateType];
          const currentAction = currentTemplate.actionButtons[frontActionCurrent.slot];
          let width = frontActionCurrent.startAction.width;
          let height = frontActionCurrent.startAction.height;
          let x = frontActionCurrent.startAction.x;
          let y = frontActionCurrent.startAction.y;

          if (frontActionCurrent.mode === "move") {
            x = frontActionCurrent.startAction.x + dxPercent;
            y = frontActionCurrent.startAction.y + dyPercent;
          } else {
            const corner = frontActionCurrent.corner ?? "se";
            if (corner === "se") {
              width = frontActionCurrent.startAction.width + dxPercent;
              height = frontActionCurrent.startAction.height + dyPercent;
              x = frontActionCurrent.startAction.x + dxPercent / 2;
              y = frontActionCurrent.startAction.y + dyPercent / 2;
            }
            if (corner === "sw") {
              width = frontActionCurrent.startAction.width - dxPercent;
              height = frontActionCurrent.startAction.height + dyPercent;
              x = frontActionCurrent.startAction.x + dxPercent / 2;
              y = frontActionCurrent.startAction.y + dyPercent / 2;
            }
            if (corner === "ne") {
              width = frontActionCurrent.startAction.width + dxPercent;
              height = frontActionCurrent.startAction.height - dyPercent;
              x = frontActionCurrent.startAction.x + dxPercent / 2;
              y = frontActionCurrent.startAction.y + dyPercent / 2;
            }
            if (corner === "nw") {
              width = frontActionCurrent.startAction.width - dxPercent;
              height = frontActionCurrent.startAction.height - dyPercent;
              x = frontActionCurrent.startAction.x + dxPercent / 2;
              y = frontActionCurrent.startAction.y + dyPercent / 2;
            }
          }

          const clampedWidth = clamp(width, MIN_ACTION_WIDTH_PERCENT, MAX_ACTION_WIDTH_PERCENT);
          const clampedHeight = clamp(height, MIN_ACTION_HEIGHT_PERCENT, MAX_ACTION_HEIGHT_PERCENT);
          const clampedX = clamp(x, clampedWidth / 2, 100 - clampedWidth / 2);
          const clampedY = clamp(y, clampedHeight / 2, 100 - clampedHeight / 2);

          const updatedTemplate = normalizeFrontTemplate(
            {
              ...currentTemplate,
              actionButtons: {
                ...currentTemplate.actionButtons,
                [frontActionCurrent.slot]: {
                  ...currentAction,
                  xPercent: clampedX,
                  yPercent: clampedY,
                  widthPercent: clampedWidth,
                  heightPercent: clampedHeight,
                },
              },
            },
            currentTemplate
          );

          return {
            books: prev.books,
            frontTemplates: {
              ...prev.frontTemplates,
              [frontActionCurrent.templateType]: updatedTemplate,
            },
          };
        });

        return;
      }
      if (coverWindowCurrent) {
        const dxPercent = ((event.clientX - coverWindowCurrent.startClientX) / coverWindowCurrent.frameRect.width) * 100;
        const dyPercent = ((event.clientY - coverWindowCurrent.startClientY) / coverWindowCurrent.frameRect.height) * 100;

        setDraft((prev) => {
          const currentTemplate = prev.frontTemplates[coverWindowCurrent.templateType];
          let width = coverWindowCurrent.startWindow.width;
          let height = coverWindowCurrent.startWindow.height;
          let x = coverWindowCurrent.startWindow.x;
          let y = coverWindowCurrent.startWindow.y;

          if (coverWindowCurrent.mode === "move") {
            x = coverWindowCurrent.startWindow.x + dxPercent;
            y = coverWindowCurrent.startWindow.y + dyPercent;
          } else {
            const corner = coverWindowCurrent.corner ?? "se";
            if (corner === "se") {
              width = coverWindowCurrent.startWindow.width + dxPercent;
              height = coverWindowCurrent.startWindow.height + dyPercent;
              x = coverWindowCurrent.startWindow.x + dxPercent / 2;
              y = coverWindowCurrent.startWindow.y + dyPercent / 2;
            }
            if (corner === "sw") {
              width = coverWindowCurrent.startWindow.width - dxPercent;
              height = coverWindowCurrent.startWindow.height + dyPercent;
              x = coverWindowCurrent.startWindow.x + dxPercent / 2;
              y = coverWindowCurrent.startWindow.y + dyPercent / 2;
            }
            if (corner === "ne") {
              width = coverWindowCurrent.startWindow.width + dxPercent;
              height = coverWindowCurrent.startWindow.height - dyPercent;
              x = coverWindowCurrent.startWindow.x + dxPercent / 2;
              y = coverWindowCurrent.startWindow.y + dyPercent / 2;
            }
            if (corner === "nw") {
              width = coverWindowCurrent.startWindow.width - dxPercent;
              height = coverWindowCurrent.startWindow.height - dyPercent;
              x = coverWindowCurrent.startWindow.x + dxPercent / 2;
              y = coverWindowCurrent.startWindow.y + dyPercent / 2;
            }
          }

          const clampedWidth = clamp(width, MIN_COVER_WINDOW_WIDTH, MAX_COVER_WINDOW_PERCENT);
          const clampedHeight = clamp(height, MIN_COVER_WINDOW_HEIGHT, MAX_COVER_WINDOW_PERCENT);
          const clampedX = clamp(x, clampedWidth / 2, 100 - clampedWidth / 2);
          const clampedY = clamp(y, clampedHeight / 2, 100 - clampedHeight / 2);

          const updatedTemplate = normalizeFrontTemplate(
            {
              ...currentTemplate,
              coverWindow: {
                xPercent: clampedX,
                yPercent: clampedY,
                widthPercent: clampedWidth,
                heightPercent: clampedHeight,
              },
            },
            currentTemplate
          );

          return {
            books: prev.books,
            frontTemplates: {
              ...prev.frontTemplates,
              [coverWindowCurrent.templateType]: updatedTemplate,
            },
          };
        });

        return;
      }

      if (frontCurrent) {
        const box = canvasRef.current?.getBoundingClientRect();
        if (!box) return;

        const dxPercent = ((event.clientX - frontCurrent.startClientX) / box.width) * 100;
        const dyPercent = ((event.clientY - frontCurrent.startClientY) / box.height) * 100;

        setDraft((prev) => {
          const currentTemplate = prev.frontTemplates[frontCurrent.templateType];
          let width = frontCurrent.startFront.width;
          let height = frontCurrent.startFront.height;
          let x = frontCurrent.startFront.x;
          let y = frontCurrent.startFront.y;

          if (frontCurrent.mode === "move") {
            x = frontCurrent.startFront.x + dxPercent;
            y = frontCurrent.startFront.y + dyPercent;
          } else {
            const corner = frontCurrent.corner ?? "se";
            if (corner === "se") {
              width = frontCurrent.startFront.width + dxPercent;
              height = frontCurrent.startFront.height + dyPercent;
              x = frontCurrent.startFront.x + dxPercent / 2;
              y = frontCurrent.startFront.y + dyPercent / 2;
            }
            if (corner === "sw") {
              width = frontCurrent.startFront.width - dxPercent;
              height = frontCurrent.startFront.height + dyPercent;
              x = frontCurrent.startFront.x + dxPercent / 2;
              y = frontCurrent.startFront.y + dyPercent / 2;
            }
            if (corner === "ne") {
              width = frontCurrent.startFront.width + dxPercent;
              height = frontCurrent.startFront.height - dyPercent;
              x = frontCurrent.startFront.x + dxPercent / 2;
              y = frontCurrent.startFront.y + dyPercent / 2;
            }
            if (corner === "nw") {
              width = frontCurrent.startFront.width - dxPercent;
              height = frontCurrent.startFront.height - dyPercent;
              x = frontCurrent.startFront.x + dxPercent / 2;
              y = frontCurrent.startFront.y + dyPercent / 2;
            }
          }

          const clampedWidth = clamp(width, MIN_FRONT_WIDTH, 92);
          const clampedHeight = clamp(height, MIN_FRONT_HEIGHT, 96);
          const clampedX = clamp(x, clampedWidth / 2, 100 - clampedWidth / 2);
          const clampedY = clamp(y, clampedHeight / 2, 100 - clampedHeight / 2);

          const updatedTemplate = normalizeFrontTemplate(
            {
              xPercent: clampedX,
              yPercent: clampedY,
              widthPercent: clampedWidth,
              heightPercent: clampedHeight,
            },
            currentTemplate
          );

          return {
            books: prev.books,
            frontTemplates: {
              ...prev.frontTemplates,
              [frontCurrent.templateType]: updatedTemplate,
            },
          };
        });

        return;
      }

      if (titleBoxCurrent) {
        const dxPercent = ((event.clientX - titleBoxCurrent.startClientX) / titleBoxCurrent.bookRect.width) * 100;
        const dyPercent = ((event.clientY - titleBoxCurrent.startClientY) / titleBoxCurrent.bookRect.height) * 100;

        setDraft((prev) => {
          const updated = prev.books.map((book) => {
            if (book.key !== titleBoxCurrent.key) return book;

            let boxWidth = titleBoxCurrent.startBox.width;
            let boxHeight = titleBoxCurrent.startBox.height;
            let boxX = titleBoxCurrent.startBox.x;
            let boxY = titleBoxCurrent.startBox.y;

            if (titleBoxCurrent.mode === "move") {
              boxX = titleBoxCurrent.startBox.x + dxPercent;
              boxY = titleBoxCurrent.startBox.y + dyPercent;
            } else {
              const corner = titleBoxCurrent.corner ?? "se";
              if (corner === "se") {
                boxWidth = titleBoxCurrent.startBox.width + dxPercent;
                boxHeight = titleBoxCurrent.startBox.height + dyPercent;
                boxX = titleBoxCurrent.startBox.x + dxPercent / 2;
                boxY = titleBoxCurrent.startBox.y + dyPercent / 2;
              }
              if (corner === "sw") {
                boxWidth = titleBoxCurrent.startBox.width - dxPercent;
                boxHeight = titleBoxCurrent.startBox.height + dyPercent;
                boxX = titleBoxCurrent.startBox.x + dxPercent / 2;
                boxY = titleBoxCurrent.startBox.y + dyPercent / 2;
              }
              if (corner === "ne") {
                boxWidth = titleBoxCurrent.startBox.width + dxPercent;
                boxHeight = titleBoxCurrent.startBox.height - dyPercent;
                boxX = titleBoxCurrent.startBox.x + dxPercent / 2;
                boxY = titleBoxCurrent.startBox.y + dyPercent / 2;
              }
              if (corner === "nw") {
                boxWidth = titleBoxCurrent.startBox.width - dxPercent;
                boxHeight = titleBoxCurrent.startBox.height - dyPercent;
                boxX = titleBoxCurrent.startBox.x + dxPercent / 2;
                boxY = titleBoxCurrent.startBox.y + dyPercent / 2;
              }
            }

            const clampedWidth = clamp(boxWidth, MIN_TITLE_BOX_WIDTH, 90);
            const clampedHeight = clamp(boxHeight, MIN_TITLE_BOX_HEIGHT, 40);
            const clampedX = clamp(boxX, clampedWidth / 2, 100 - clampedWidth / 2);
            const clampedY = clamp(boxY, clampedHeight / 2, 100 - clampedHeight / 2);

            return {
              ...book,
              titleBoxXPercent: Number(clampedX.toFixed(2)),
              titleBoxYPercent: Number(clampedY.toFixed(2)),
              titleBoxWidthPercent: Number(clampedWidth.toFixed(2)),
              titleBoxHeightPercent: Number(clampedHeight.toFixed(2)),
            };
          });

          return { books: updated, frontTemplates: prev.frontTemplates };
        });
      }

      if (!current) return;

      const box = canvasRef.current?.getBoundingClientRect();
      if (!box) return;

      const dxPercent = ((event.clientX - current.startClientX) / box.width) * 100;
      const dyPercent = ((event.clientY - current.startClientY) / box.height) * 100;

      setDraft((prev) => {
        const updated = prev.books.map((book) => {
          if (book.key !== current.key) return book;

          let next: BookItem;
          if (current.mode === "move") {
            const x = current.startBook.xPercent + dxPercent;
            const y = current.startBook.yPercent + dyPercent;
            next = {
              ...book,
              xPercent: x,
              yPercent: y,
            };
          } else {
            const corner = current.corner ?? "se";
            let width = current.startBook.widthPercent;
            let height = current.startBook.heightPercent;
            let x = current.startBook.xPercent;
            let y = current.startBook.yPercent;

            if (corner === "se") {
              width = current.startBook.widthPercent + dxPercent;
              height = current.startBook.heightPercent + dyPercent;
              x = current.startBook.xPercent + dxPercent / 2;
              y = current.startBook.yPercent + dyPercent / 2;
            }
            if (corner === "sw") {
              width = current.startBook.widthPercent - dxPercent;
              height = current.startBook.heightPercent + dyPercent;
              x = current.startBook.xPercent + dxPercent / 2;
              y = current.startBook.yPercent + dyPercent / 2;
            }
            if (corner === "ne") {
              width = current.startBook.widthPercent + dxPercent;
              height = current.startBook.heightPercent - dyPercent;
              x = current.startBook.xPercent + dxPercent / 2;
              y = current.startBook.yPercent + dyPercent / 2;
            }
            if (corner === "nw") {
              width = current.startBook.widthPercent - dxPercent;
              height = current.startBook.heightPercent - dyPercent;
              x = current.startBook.xPercent + dxPercent / 2;
              y = current.startBook.yPercent + dyPercent / 2;
            }

            next = {
              ...book,
              widthPercent: width,
              heightPercent: height,
              xPercent: x,
              yPercent: y,
            };
          }

          return normalizeBook(next, book);
        });

        return { books: updated, frontTemplates: prev.frontTemplates };
      });
    }

    function onPointerUp() {
      navDragRef.current = null;
      interactionRef.current = null;
      panelInteractionRef.current = null;
      titleBoxInteractionRef.current = null;
      frontInteractionRef.current = null;
      coverWindowInteractionRef.current = null;
      frontActionInteractionRef.current = null;
      adminLogoInteractionRef.current = null;
    }

    function onMouseMove(event: MouseEvent) {
      if (!editMode) return;
      if (applyNavDrag(event.clientX, event.clientY)) return;
    }

    function onMouseUp() {
      if (navDragRef.current?.pointerId === -2) {
        navDragRef.current = null;
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (!editMode) return;
      const touch = event.touches[0];
      if (!touch) return;
      if (applyNavDrag(touch.clientX, touch.clientY)) {
        event.preventDefault();
      }
    }

    function onTouchEnd() {
      if (navDragRef.current?.pointerId === -1) {
        navDragRef.current = null;
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [editMode]);

  function startPanelDrag(event: ReactPointerEvent<HTMLHeadingElement>) {
    if (!editMode) return;
    panelInteractionRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: editorPos.x,
      startY: editorPos.y,
    };
  }

  function setNavVarValue(key: string, value: string) {
    setNavVars((current) => ({ ...current, [key]: value }));
  }

  function beginNavDrag(target: "back" | "next", clientX: number, clientY: number, pointerId: number) {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const canvasWidth = Math.max(canvasRect?.width ?? window.innerWidth, 1);
    const canvasHeight = Math.max(canvasRect?.height ?? window.innerHeight, 1);

    navDragRef.current = {
      target,
      pointerId,
      startClientX: clientX,
      startClientY: clientY,
      canvasWidth,
      canvasHeight,
      startBackX: safeNavBackX,
      startBackY: safeNavBackY,
      startNextX: safeNavNextX,
      startNextY: safeNavNextY,
    };
  }

  function startNavDrag(target: "back" | "next", event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    beginNavDrag(target, event.clientX, event.clientY, event.pointerId);
  }

  function startNavMouseDrag(target: "back" | "next", event: ReactMouseEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    beginNavDrag(target, event.clientX, event.clientY, -2);
  }

  function startNavTouchDrag(target: "back" | "next", event: ReactTouchEvent<HTMLButtonElement>) {
    if (!editMode) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopPropagation();
    beginNavDrag(target, touch.clientX, touch.clientY, -1);
  }

  async function saveNavLayout(target: "both" | "back" | "next" = "both") {
    setNavSaving(true);
    setNavStatus(null);
    try {
      const response = await fetch("/api/bookcase-shelf-nav-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: navProfile, vars: navVars }),
      });
      const payload = (await response.json()) as ShelfNavApiResult;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save arrow layout.");
      }
      setNavVars(payload.vars || navVars);
      if (target === "back") {
        setNavStatus("Back arrow saved.");
      } else if (target === "next") {
        setNavStatus("Next arrow saved.");
      } else {
        setNavStatus("Arrow layout saved.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save arrow layout.";
      setNavStatus(message);
    } finally {
      setNavSaving(false);
    }
  }

  function onNavProfileChange(nextProfile: BookcaseShelfNavProfileKey) {
    setNavProfile(nextProfile);
    const params = new URLSearchParams(searchParams.toString());
    params.set("previewProfile", nextProfile);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateBook(key: string, updates: Partial<BookItem>) {
    setDraft((prev) => ({
      books: prev.books.map((book) =>
        book.key === key ? normalizeBook({ ...book, ...updates }, book) : book
      ),
      frontTemplates: prev.frontTemplates,
    }));
  }

  function startMove(key: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    adminLogoInteractionRef.current = null;
    const book = draft.books.find((item) => item.key === key);
    if (!book) return;

    interactionRef.current = {
      mode: "move",
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBook: book,
    };
    setActiveKey(key);
  }

  function startResize(key: string, corner: ResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    adminLogoInteractionRef.current = null;
    const book = draft.books.find((item) => item.key === key);
    if (!book) return;

    interactionRef.current = {
      mode: "resize",
      key,
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBook: book,
    };
    setActiveKey(key);
  }

  function startTitleBoxMove(key: string, event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    adminLogoInteractionRef.current = null;

    const book = draft.books.find((item) => item.key === key);
    if (!book) return;

    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    titleBoxInteractionRef.current = {
      mode: "move",
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: {
        x: book.titleBoxXPercent,
        y: book.titleBoxYPercent,
        width: book.titleBoxWidthPercent,
        height: book.titleBoxHeightPercent,
      },
      bookRect: { width: rect.width, height: rect.height },
    };
    setActiveKey(key);
  }

  function startTitleBoxResize(
    key: string,
    corner: ResizeCorner,
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    adminLogoInteractionRef.current = null;

    const book = draft.books.find((item) => item.key === key);
    if (!book) return;

    const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    titleBoxInteractionRef.current = {
      mode: "resize",
      key,
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: {
        x: book.titleBoxXPercent,
        y: book.titleBoxYPercent,
        width: book.titleBoxWidthPercent,
        height: book.titleBoxHeightPercent,
      },
      bookRect: { width: rect.width, height: rect.height },
    };
    setActiveKey(key);
  }

  function startFrontMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    frontActionInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const template = draft.frontTemplates[activeFrontType];
    frontInteractionRef.current = {
      mode: "move",
      templateType: activeFrontType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFront: {
        x: template.xPercent,
        y: template.yPercent,
        width: template.widthPercent,
        height: template.heightPercent,
      },
    };
  }

  function startFrontResize(corner: ResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    frontActionInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const template = draft.frontTemplates[activeFrontType];
    frontInteractionRef.current = {
      mode: "resize",
      templateType: activeFrontType,
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFront: {
        x: template.xPercent,
        y: template.yPercent,
        width: template.widthPercent,
        height: template.heightPercent,
      },
    };
  }

  function startCoverWindowMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    frontActionInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const frameRect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!frameRect) return;

    const template = draft.frontTemplates[activeFrontType];
    coverWindowInteractionRef.current = {
      mode: "move",
      templateType: activeFrontType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWindow: {
        x: template.coverWindow.xPercent,
        y: template.coverWindow.yPercent,
        width: template.coverWindow.widthPercent,
        height: template.coverWindow.heightPercent,
      },
      frameRect: { width: frameRect.width, height: frameRect.height },
    };
  }

  function startCoverWindowResize(corner: ResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    frontActionInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const frameRect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!frameRect) return;

    const template = draft.frontTemplates[activeFrontType];
    coverWindowInteractionRef.current = {
      mode: "resize",
      templateType: activeFrontType,
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWindow: {
        x: template.coverWindow.xPercent,
        y: template.coverWindow.yPercent,
        width: template.coverWindow.widthPercent,
        height: template.coverWindow.heightPercent,
      },
      frameRect: { width: frameRect.width, height: frameRect.height },
    };
  }

  function startFrontActionMove(slot: FrontActionSlot, event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const frameRect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!frameRect) return;

    const template = draft.frontTemplates[activeFrontType];
    const action = template.actionButtons[slot];
    event.currentTarget.setPointerCapture(event.pointerId);
    frontActionInteractionRef.current = {
      mode: "move",
      templateType: activeFrontType,
      slot,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startAction: {
        x: action.xPercent,
        y: action.yPercent,
        width: action.widthPercent,
        height: action.heightPercent,
      },
      frameRect: { width: frameRect.width, height: frameRect.height },
    };
  }

  function startFrontActionResize(
    slot: FrontActionSlot,
    corner: ResizeCorner,
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    adminLogoInteractionRef.current = null;

    const frameRect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!frameRect) return;

    const template = draft.frontTemplates[activeFrontType];
    const action = template.actionButtons[slot];
    event.currentTarget.setPointerCapture(event.pointerId);
    frontActionInteractionRef.current = {
      mode: "resize",
      templateType: activeFrontType,
      slot,
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startAction: {
        x: action.xPercent,
        y: action.yPercent,
        width: action.widthPercent,
        height: action.heightPercent,
      },
      frameRect: { width: frameRect.width, height: frameRect.height },
    };
  }

  function updateAdminLogo(updates: Partial<AdminLogoTemplate>) {
    setDraft((prev) => ({
      books: prev.books,
      frontTemplates: {
        ...prev.frontTemplates,
        adminLogo: normalizeAdminLogo(
          { ...prev.frontTemplates.adminLogo, ...updates },
          prev.frontTemplates.adminLogo
        ),
      },
    }));
  }

  function startAdminLogoMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editMode || !isAdmin) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    frontActionInteractionRef.current = null;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const logo = draft.frontTemplates.adminLogo;
    adminLogoInteractionRef.current = {
      mode: "move",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLogo: {
        x: logo.xPercent,
        y: logo.yPercent,
        width: logo.widthPercent,
        height: logo.heightPercent,
      },
      canvasRect: { width: rect.width, height: rect.height },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setStatus("Admin logo moved. Click Save Books to persist.");
  }

  function startAdminLogoResize(corner: ResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editMode || !isAdmin) return;
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = null;
    titleBoxInteractionRef.current = null;
    frontInteractionRef.current = null;
    coverWindowInteractionRef.current = null;
    frontActionInteractionRef.current = null;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const logo = draft.frontTemplates.adminLogo;
    adminLogoInteractionRef.current = {
      mode: "resize",
      corner,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLogo: {
        x: logo.xPercent,
        y: logo.yPercent,
        width: logo.widthPercent,
        height: logo.heightPercent,
      },
      canvasRect: { width: rect.width, height: rect.height },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setStatus("Admin logo resized. Click Save Books to persist.");
  }

  function applyCoverWindow(
    templateType: "gold" | "brown",
    coverWindow: FrontTemplate["coverWindow"],
    statusMessage: string
  ) {
    setDraft((prev) => {
      const currentTemplate = prev.frontTemplates[templateType];
      const updatedTemplate = normalizeFrontTemplate(
        {
          ...currentTemplate,
          coverWindow,
        },
        currentTemplate
      );

      return {
        books: prev.books,
        frontTemplates: {
          ...prev.frontTemplates,
          [templateType]: updatedTemplate,
        },
      };
    });
    setStatus(statusMessage);
  }

  function resetCoverWindow(templateType: "gold" | "brown") {
    applyCoverWindow(templateType, { ...DEFAULT_COVER_WINDOW }, "Cover window reset. Click Save Books to persist.");
  }

  function fillCoverWindow(templateType: "gold" | "brown") {
    applyCoverWindow(
      templateType,
      {
        xPercent: 50,
        yPercent: 50,
        widthPercent: MAX_COVER_WINDOW_PERCENT,
        heightPercent: MAX_COVER_WINDOW_PERCENT,
      },
      "Cover window expanded to frame. Click Save Books to persist."
    );
  }

  async function uploadCoverImage(key: string, file: File | null) {
    if (!file) return;

    setStatus("Uploading cover...");
    try {
      const form = new FormData();
      form.append("pageKey", pageKey);
      form.append("bookKey", key);
      form.append("file", file);

      const response = await fetch("/api/bookcase-cover-upload", {
        method: "POST",
        body: form,
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data && typeof data === "object" && typeof (data as Record<string, unknown>).error === "string"
            ? String((data as Record<string, unknown>).error)
            : "Upload failed.";
        setStatus(message);
        return;
      }

      const url =
        data && typeof data === "object" && typeof (data as Record<string, unknown>).url === "string"
          ? String((data as Record<string, unknown>).url)
          : "";

      if (!url) {
        setStatus("Upload did not return a cover URL.");
        return;
      }

      updateBook(key, { coverImageUrl: url });
      setStatus("Cover uploaded. Click Save Books to persist.");
    } catch {
      setStatus("Upload failed.");
    }
  }

  async function uploadReaderMedia(key: string, slot: ReaderSlot, file: File | null) {
    if (!file) return;

    setStatus(`Uploading ${slot} media...`);
    try {
      const form = new FormData();
      form.append("pageKey", pageKey);
      form.append("bookKey", key);
      form.append("slot", slot);
      form.append("file", file);

      const response = await fetch("/api/bookcase-reader-upload", {
        method: "POST",
        body: form,
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data && typeof data === "object" && typeof (data as Record<string, unknown>).error === "string"
            ? String((data as Record<string, unknown>).error)
            : "Upload failed.";
        setStatus(message);
        return;
      }

      const url =
        data && typeof data === "object" && typeof (data as Record<string, unknown>).url === "string"
          ? String((data as Record<string, unknown>).url)
          : "";
      const contentType =
        data && typeof data === "object" && typeof (data as Record<string, unknown>).contentType === "string"
          ? String((data as Record<string, unknown>).contentType)
          : file.type;

      if (!url) {
        setStatus("Upload did not return a media URL.");
        return;
      }

      if (slot === "sample") {
        updateBook(key, {
          readerSampleMediaUrl: url,
          readerSampleMediaType: contentType,
        });
      } else if (slot === "info") {
        updateBook(key, {
          infoPageMediaUrl: url,
          infoPageMediaType: contentType,
        });
      } else {
        updateBook(key, {
          fullBookMediaUrl: url,
          fullBookMediaType: contentType,
        });
      }

      const slotLabel = slot === "sample" ? "Reader sample" : slot === "info" ? "Information page" : "Full book";
      setStatus(`${slotLabel} media uploaded. Click Save Books to persist.`);
    } catch {
      setStatus("Upload failed.");
    }
  }

  async function saveLayout() {
    setStatus("Saving...");
    try {
      const booksToSave = draft.books
        .map((book, index) => {
          const nextBook = {
            ...book,
            label: isSlotPlaceholderLabel(book.label, book.key) ? "" : book.label,
          };
          return normalizeBook(nextBook, defaultBookByIndex(pageKey, index));
        });
      const frontTemplatesToSave = normalizeFrontTemplates(draft.frontTemplates);

      const response = await fetch("/api/bookcase-book-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, profile: navProfile, books: booksToSave, frontTemplates: frontTemplatesToSave }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          typeof (data as Record<string, unknown>).error === "string"
            ? String((data as Record<string, unknown>).error)
            : "Unable to save books.";
        setStatus(message);
        return;
      }

      const normalized = normalizeLayout(
        data && typeof data === "object" ? (data as Record<string, unknown>).layout : null,
        pageKey
      );
      setLayout(normalized);
      setDraft(normalized);
      setActiveKey(normalized.books[0]?.key ?? "");
      setStatus(`Saved for ${BOOKCASE_SHELF_NAV_PROFILE_LABELS[navProfile]}.`);
    } catch {
      setStatus("Unable to save books.");
    }
  }

  function openAddBookcaseModal() {
    if (!isAdmin || !editMode) return;
    setPendingBookcaseKey(suggestedNextBookcaseKey || "");
    setShowAddBookcaseModal(true);
  }

  function cancelAddBookcase() {
    if (creatingBookcase) return;
    setShowAddBookcaseModal(false);
    setPendingBookcaseKey("");
  }

  async function confirmAddBookcase() {
    if (!isAdmin || !editMode || creatingBookcase) return;
    const nextKey = normalizeBookcaseKey(pendingBookcaseKey);
    if (!nextKey) {
      setStatus("Please add a valid new bookcase key.");
      return;
    }

    setCreatingBookcase(true);
    setStatus("Creating new bookcase...");
    try {
      const response = await fetch("/api/bookcase-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageKey: nextKey,
          sourcePageKey: pageKey,
          templateBooks: draft.books,
          templateFrontTemplates: normalizeFrontTemplates(draft.frontTemplates),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data && typeof data === "object" && typeof (data as Record<string, unknown>).error === "string"
            ? String((data as Record<string, unknown>).error)
            : "Unable to create bookcase.";
        setStatus(message);
        setCreatingBookcase(false);
        return;
      }

      const page =
        data && typeof data === "object" && typeof (data as Record<string, unknown>).page === "object"
          ? ((data as Record<string, unknown>).page as Record<string, unknown>)
          : null;
      const path = page && typeof page.path === "string" ? page.path : "";
      const label = page && typeof page.label === "string" ? page.label : "Bookcase";

      setStatus(`${label} created. Opening editor...`);
      setShowAddBookcaseModal(false);
      setPendingBookcaseKey("");
      setCreatingBookcase(false);
      if (path) {
        window.location.assign(`${path}?edit=1`);
      }
    } catch {
      setStatus("Unable to create bookcase.");
      setCreatingBookcase(false);
    }
  }

  function resetDraft() {
    setDraft(layout);
    setActiveKey(layout.books[0]?.key ?? "");
    setStatus("Reset to last saved.");
  }

  function addNextBook() {
    if (draft.books.length >= MAX_BOOKS) {
      setStatus(`Reached max of ${MAX_BOOKS} books.`);
      return;
    }

    setDraft((prev) => {
      const index = prev.books.length;
      const next = defaultBookByIndex(pageKey, index);
      next.key = nextBookKey(prev.books);
      next.label = "";
      const updated = { books: [...prev.books, next], frontTemplates: prev.frontTemplates };
      setActiveKey(next.key);
      setPendingBookKey(next.key);
      setStatus("Position slot added. Add a title now or later.");
      return updated;
    });

    setShowAddModal(true);
  }

  function confirmAddBook() {
    if (!pendingBook) {
      setShowAddModal(false);
      setPendingBookKey("");
      return;
    }

    setStatus("Slot updated. Click Save Books to persist.");
    setShowAddModal(false);
    setPendingBookKey("");
  }

  function cancelAddBook() {
    if (pendingBookKey) {
      setDraft((prev) => ({
        books: prev.books.filter((book) => book.key !== pendingBookKey),
        frontTemplates: prev.frontTemplates,
      }));
      setActiveKey((prev) => (prev === pendingBookKey ? "" : prev));
      setStatus("Add canceled.");
    }

    setShowAddModal(false);
    setPendingBookKey("");
  }

  function deleteActiveBook() {
    if (!activeBook) return;

    setDraft((prev) => {
      const nextBooks = prev.books.filter((book) => book.key !== activeBook.key);
      setActiveKey(nextBooks[0]?.key ?? "");
      setStatus("Book removed. Click Save Books to persist.");
      return { books: nextBooks, frontTemplates: prev.frontTemplates };
    });
  }

  function openCoverPreview(bookKey: string) {
    const book = draft.books.find((item) => item.key === bookKey);
    if (book) {
      setSelectedBookForPreview(bookKey);
    }
  }

  function closeCoverPreview() {
    setSelectedBookForPreview("");
  }

  return (
    <>
      {!isAdmin && searchParams.get("edit") === "1" && (
        <div className="bookcase-edit-lock-banner">
          <span>Admin login required on this device for drag/save editing.</span>
          <a href="/login?mode=login">Admin Login</a>
        </div>
      )}
      {loading && <p className="bookcase-status">Loading book layout...</p>}
      {!loading && status && <p className="bookcase-status">{status}</p>}

      {editMode && (
        <aside className="bookcase-editor books-editor" style={{ left: `${editorPos.x}px`, top: `${editorPos.y}px`, right: "auto" }}>
          <h2 onPointerDown={startPanelDrag} className="books-editor-title">Book Position Editor</h2>
          <div className="bookcase-editor-scroll">
            <div className="bookcase-editor-actions">
              <button type="button" onClick={addNextBook}>
                Add Book
              </button>
              {isAdmin && (
                <button type="button" onClick={openAddBookcaseModal}>
                  Add Bookcase
                </button>
              )}
            </div>

            <label className="bookcase-editor-label">
              Arrow Profile
              <select
                value={navProfile}
                onChange={(event) => onNavProfileChange(event.target.value as BookcaseShelfNavProfileKey)}
                disabled={navLoading || navSaving}
              >
                {BOOKCASE_SHELF_NAV_PROFILE_KEYS.map((profileKey) => (
                  <option key={profileKey} value={profileKey}>
                    {BOOKCASE_SHELF_NAV_PROFILE_LABELS[profileKey]}
                  </option>
                ))}
              </select>
            </label>

            <label className="bookcase-editor-label">
              Arrow Size (% of screen width)
              <input
                type="range"
                min={6}
                max={40}
                value={Math.round(safeNavWidth)}
                onChange={(event) => setNavVarValue("--bookcase-nav-width", `${event.target.value}%`)}
                disabled={navLoading || navSaving}
              />
            </label>

            <div className="bookcase-editor-actions">
              <button type="button" onClick={() => void saveNavLayout("back")} disabled={navLoading || navSaving}>
                {navSaving ? "Saving..." : "Save Back Arrow"}
              </button>
              <button type="button" onClick={() => void saveNavLayout("next")} disabled={navLoading || navSaving}>
                {navSaving ? "Saving..." : "Save Next Arrow"}
              </button>
              <button type="button" onClick={() => void saveNavLayout("both")} disabled={navLoading || navSaving}>
                {navSaving ? "Saving..." : "Save Both"}
              </button>
              <button type="button" onClick={() => setNavReloadToken((current) => current + 1)} disabled={navLoading || navSaving}>
                Reload Arrows
              </button>
            </div>
            <p className="bookcase-editor-hint">Drag Back/Next signs on screen to place them for this profile.</p>
            {navStatus && <p className="bookcase-editor-hint">{navStatus}</p>}
            <p className="bookcase-editor-hint">Book positions/sizes also save to this same profile.</p>

            {!activeBook ? (
              <p className="bookcase-editor-hint">No books yet. Click Add Book to create the first slot.</p>
            ) : (
              <>
          <label className="bookcase-editor-label">
            Active Book
            <select
              value={activeBook.key}
              onChange={(event) => setActiveKey(event.target.value)}
            >
              {draft.books.map((book) => (
                <option key={book.key} value={book.key}>
                  {book.label || `Untitled (${book.key})`}
                </option>
              ))}
            </select>
          </label>

          <div className="bookcase-editor-actions">
            <button type="button" onClick={() => setEditorFormPage(1)} aria-pressed={editorFormPage === 1}>
              Page 1
            </button>
            <button type="button" onClick={() => setEditorFormPage(2)} aria-pressed={editorFormPage === 2}>
              Page 2
            </button>
            <button type="button" onClick={() => setEditorFormPage(3)} aria-pressed={editorFormPage === 3}>
              Page 3
            </button>
          </div>

          {editorFormPage === 1 && (
            <>
              <label className="bookcase-editor-label">
                Title
                <input
                  value={activeBook.label}
                  onChange={(event) => updateBook(activeBook.key, { label: event.target.value })}
                />
              </label>

              <label className="bookcase-editor-label">
                Title Font
                <select
                  value={activeBook.titleFont}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      titleFont: (event.target.value as BookItem["titleFont"]) || "classic",
                    })
                  }
                >
                  {TITLE_FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bookcase-editor-label">
                Title Size (vw)
                <input
                  type="number"
                  min={1.2}
                  max={3.8}
                  step={0.1}
                  value={activeBook.titleSizeVw}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      titleSizeVw: clamp(Number(event.target.value) || 1.2, 1.2, 3.8),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-label">
                Title Color
                <select
                  value={activeBook.titleColor}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      titleColor: event.target.value === "black" ? "black" : "brown",
                    })
                  }
                >
                  <option value="brown">Brown</option>
                  <option value="black">Black</option>
                </select>
              </label>

              <label className="bookcase-editor-label">
                Spine Template
                <select
                  value={activeBook.spineType}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      spineType: event.target.value === "brown" ? "brown" : "gold",
                    })
                  }
                >
                  <option value="gold">Gold spine</option>
                  <option value="brown">Brown spine</option>
                </select>
              </label>

              <label className="bookcase-editor-label">
                Target Path
                <select
                  value={activeBook.targetPath}
                  onChange={(event) => updateBook(activeBook.key, { targetPath: event.target.value })}
                >
                  {activeTargetPathOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {editorFormPage === 2 && (
            <>
              <label className="bookcase-editor-label">
                Cover Image URL
                <input
                  value={activeBook.coverImageUrl}
                  onChange={(event) => updateBook(activeBook.key, { coverImageUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>

              <label className="bookcase-editor-label">
                Upload Cover Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void uploadCoverImage(activeBook.key, file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="bookcase-editor-label">
                Reader Sample Text
                <textarea
                  rows={5}
                  value={activeBook.readerSampleText}
                  onChange={(event) => updateBook(activeBook.key, { readerSampleText: event.target.value })}
                  placeholder="Text shown on the Reader Sample page"
                />
              </label>

              <label className="bookcase-editor-label">
                Reader Sample Media URL
                <input
                  value={activeBook.readerSampleMediaUrl}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      readerSampleMediaUrl: event.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="bookcase-editor-label">
                Upload Reader Sample Media
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void uploadReaderMedia(activeBook.key, "sample", file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="bookcase-editor-label">
                Information Page Text
                <textarea
                  rows={5}
                  value={activeBook.infoPageText}
                  onChange={(event) => updateBook(activeBook.key, { infoPageText: event.target.value })}
                  placeholder="Text shown on the Information Page"
                />
              </label>

              <label className="bookcase-editor-label">
                Information Page Media URL
                <input
                  value={activeBook.infoPageMediaUrl}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      infoPageMediaUrl: event.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </label>
            </>
          )}

          {editorFormPage === 3 && (
            <>
              <label className="bookcase-editor-label">
                Upload Information Page Media
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void uploadReaderMedia(activeBook.key, "info", file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="bookcase-editor-label">
                Full Book Media URL
                <input
                  value={activeBook.fullBookMediaUrl}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      fullBookMediaUrl: event.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="bookcase-editor-label">
                Upload Full Book Media
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,application/pdf,application/epub+zip,text/plain"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void uploadReaderMedia(activeBook.key, "full", file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label className="bookcase-editor-label">
                Hide First Pages (EPUB, 0 = off)
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  value={activeBook.fullBookHideFirstPages}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      fullBookHideFirstPages: clamp(Math.round(Number(event.target.value) || 0), 0, 5000),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-label">
                Hide After Page (EPUB, 0 = off)
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={1}
                  value={activeBook.fullBookMaxPages}
                  onChange={(event) =>
                    updateBook(activeBook.key, {
                      fullBookMaxPages: clamp(Math.round(Number(event.target.value) || 0), 0, 5000),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-toggle">
                <span>Show front cover overlay</span>
                <input
                  type="checkbox"
                  checked={showFrontTemplate}
                  onChange={(event) => setShowFrontTemplate(event.target.checked)}
                />
              </label>

              <label className="bookcase-editor-toggle">
                <span>Show back cover overlay</span>
                <input
                  type="checkbox"
                  checked={showBackTemplate}
                  onChange={(event) => setShowBackTemplate(event.target.checked)}
                />
              </label>

              <div className="bookcase-editor-actions front-template-actions">
                <button type="button" onClick={() => resetCoverWindow(activeFrontType)}>
                  Reset Cover Window
                </button>
                <button type="button" onClick={() => fillCoverWindow(activeFrontType)}>
                  Fill Cover Window
                </button>
              </div>

              <label className="bookcase-editor-label">
                Admin Logo X (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={adminLogoTemplate.xPercent}
                  onChange={(event) =>
                    updateAdminLogo({
                      xPercent: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-label">
                Admin Logo Y (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={adminLogoTemplate.yPercent}
                  onChange={(event) =>
                    updateAdminLogo({
                      yPercent: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-label">
                Admin Logo Width (%)
                <input
                  type="number"
                  min={MIN_ADMIN_LOGO_WIDTH_PERCENT}
                  max={MAX_ADMIN_LOGO_WIDTH_PERCENT}
                  step={0.1}
                  value={adminLogoTemplate.widthPercent}
                  onChange={(event) =>
                    updateAdminLogo({
                      widthPercent: Number(event.target.value),
                    })
                  }
                />
              </label>

              <label className="bookcase-editor-label">
                Admin Logo Height (%)
                <input
                  type="number"
                  min={MIN_ADMIN_LOGO_HEIGHT_PERCENT}
                  max={MAX_ADMIN_LOGO_HEIGHT_PERCENT}
                  step={0.1}
                  value={adminLogoTemplate.heightPercent}
                  onChange={(event) =>
                    updateAdminLogo({
                      heightPercent: Number(event.target.value),
                    })
                  }
                />
              </label>

              <details className="bookcase-coords-panel">
                <summary>Coordinates</summary>
                <p className="bookcase-coords">
                  Front template follows spine: {activeFrontType === "gold" ? "Gold" : "Brown"}
                </p>
                <p className="bookcase-coords">
                  X: {activeBook.xPercent.toFixed(2)}% | Y: {activeBook.yPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  W: {activeBook.widthPercent.toFixed(2)}% | H: {activeBook.heightPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Front X: {activeFrontTemplate.xPercent.toFixed(2)}% | Front Y: {activeFrontTemplate.yPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Front W: {activeFrontTemplate.widthPercent.toFixed(2)}% | Front H: {activeFrontTemplate.heightPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Cover X: {activeFrontTemplate.coverWindow.xPercent.toFixed(2)}% | Cover Y: {activeFrontTemplate.coverWindow.yPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Cover W: {activeFrontTemplate.coverWindow.widthPercent.toFixed(2)}% | Cover H: {activeFrontTemplate.coverWindow.heightPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Sample Logo X: {activeFrontTemplate.actionButtons.sample.xPercent.toFixed(2)}% | Y:{" "}
                  {activeFrontTemplate.actionButtons.sample.yPercent.toFixed(2)}% | W:{" "}
                  {activeFrontTemplate.actionButtons.sample.widthPercent.toFixed(2)}% | H:{" "}
                  {activeFrontTemplate.actionButtons.sample.heightPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Info Logo X: {activeFrontTemplate.actionButtons.info.xPercent.toFixed(2)}% | Y:{" "}
                  {activeFrontTemplate.actionButtons.info.yPercent.toFixed(2)}% | W:{" "}
                  {activeFrontTemplate.actionButtons.info.widthPercent.toFixed(2)}% | H:{" "}
                  {activeFrontTemplate.actionButtons.info.heightPercent.toFixed(2)}%
                </p>
                <p className="bookcase-coords">
                  Admin Logo X: {adminLogoTemplate.xPercent.toFixed(2)}% | Y: {adminLogoTemplate.yPercent.toFixed(2)}% | W:{" "}
                  {adminLogoTemplate.widthPercent.toFixed(2)}% | H: {adminLogoTemplate.heightPercent.toFixed(2)}%
                </p>
              </details>
            </>
          )}

          <div className="bookcase-editor-actions">
            <button type="button" onClick={saveLayout}>
              Save Books
            </button>
            <button type="button" onClick={resetDraft}>
              Reset
            </button>
            <button type="button" onClick={deleteActiveBook}>
              Delete Active Book
            </button>
          </div>

          <p className="bookcase-editor-hint">
            Drag books, title boxes, front template, and the admin logo. Save to persist all coordinates.
          </p>
              </>
            )}
          </div>
        </aside>
      )}

      <div
        ref={canvasRef}
        className="books-layer"
        data-books-edit={editMode ? "1" : "0"}
        data-show-back-template={showBackTemplate ? "true" : "false"}
      >
        {editMode && (
          <>
            <button
              type="button"
              className="bookcase-nav-edit-box bookcase-nav-edit-box-back"
              style={{
                left: `${safeNavBackX}%`,
                top: `${safeNavBackY}%`,
                width: `${safeNavWidth}vw`,
              }}
              onPointerDown={(event) => startNavDrag("back", event)}
              onMouseDown={(event) => startNavMouseDrag("back", event)}
              onTouchStart={(event) => startNavTouchDrag("back", event)}
              aria-label="Move back sign"
            >
              Back
            </button>
            <button
              type="button"
              className="bookcase-nav-edit-box bookcase-nav-edit-box-next"
              style={{
                left: `${safeNavNextX}%`,
                top: `${safeNavNextY}%`,
                width: `${safeNavWidth}vw`,
              }}
              onPointerDown={(event) => startNavDrag("next", event)}
              onMouseDown={(event) => startNavMouseDrag("next", event)}
              onTouchStart={(event) => startNavTouchDrag("next", event)}
              aria-label="Move next sign"
            >
              Next
            </button>
          </>
        )}

        {editMode && activeBook && showFrontTemplate && (
          <div
            className="book-front-template"
            style={{
              left: `${activeFrontTemplate.xPercent}%`,
              top: `${activeFrontTemplate.yPercent}%`,
              width: `${activeFrontTemplate.widthPercent}%`,
              height: `${activeFrontTemplate.heightPercent}%`,
              backgroundColor: "transparent",
            }}
            onPointerDown={startFrontMove}
          >
            <div
              className="book-front-stage"
              style={{
                width: `${activeViewport.stageWidthPercent}%`,
                height: `${activeViewport.stageHeightPercent}%`,
                left: `${activeViewport.stageLeftPercent}%`,
                top: `${activeViewport.stageTopPercent}%`,
              }}
            >
              {activeBook.coverImageUrl && (
                <div
                  className="book-front-cover"
                  style={{
                    backgroundImage: `url(${activeBook.coverImageUrl})`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    left: `${activeFrontTemplate.coverWindow.xPercent}%`,
                    top: `${activeFrontTemplate.coverWindow.yPercent}%`,
                    width: `${activeFrontTemplate.coverWindow.widthPercent}%`,
                    height: `${activeFrontTemplate.coverWindow.heightPercent}%`,
                  }}
                />
              )}
              <div className={`book-front-frame book-front-frame-${activeFrontType}`} />
              <div
                className="book-front-window"
                style={{
                  left: `${activeFrontTemplate.coverWindow.xPercent}%`,
                  top: `${activeFrontTemplate.coverWindow.yPercent}%`,
                  width: `${activeFrontTemplate.coverWindow.widthPercent}%`,
                  height: `${activeFrontTemplate.coverWindow.heightPercent}%`,
                }}
                onPointerDown={startCoverWindowMove}
              >
                <button
                  type="button"
                  className="shelf-book-handle handle-nw"
                  onPointerDown={(event) => startCoverWindowResize("nw", event)}
                  aria-label="Resize cover window top left"
                />
                <button
                  type="button"
                  className="shelf-book-handle handle-ne"
                  onPointerDown={(event) => startCoverWindowResize("ne", event)}
                  aria-label="Resize cover window top right"
                />
                <button
                  type="button"
                  className="shelf-book-handle handle-sw"
                  onPointerDown={(event) => startCoverWindowResize("sw", event)}
                  aria-label="Resize cover window bottom left"
                />
                <button
                  type="button"
                  className="shelf-book-handle handle-se"
                  onPointerDown={(event) => startCoverWindowResize("se", event)}
                  aria-label="Resize cover window bottom right"
                />
              </div>
              {(["sample", "info"] as FrontActionSlot[]).map((slot) => {
                const action = activeFrontTemplate.actionButtons[slot];
                const label = slot === "sample" ? "Reader sample logo" : "Information page logo";
                const logoPath = actionLogoPath(activeFrontType, slot);
                return (
                  <div
                    key={slot}
                    className="front-action-badge front-action-badge-edit"
                    style={{
                      left: `${action.xPercent}%`,
                      top: `${action.yPercent}%`,
                      width: `${action.widthPercent}%`,
                      height: `${action.heightPercent}%`,
                    }}
                    onPointerDown={(event) => startFrontActionMove(slot, event)}
                    aria-label={label}
                >
                  <img src={logoPath} alt={label} className="front-action-logo-image" />
                    <button
                      type="button"
                      className="shelf-book-handle front-action-handle handle-nw"
                      onPointerDown={(event) => startFrontActionResize(slot, "nw", event)}
                      aria-label={`Resize ${label} top left`}
                    />
                    <button
                      type="button"
                      className="shelf-book-handle front-action-handle handle-ne"
                      onPointerDown={(event) => startFrontActionResize(slot, "ne", event)}
                      aria-label={`Resize ${label} top right`}
                    />
                    <button
                      type="button"
                      className="shelf-book-handle front-action-handle handle-sw"
                      onPointerDown={(event) => startFrontActionResize(slot, "sw", event)}
                      aria-label={`Resize ${label} bottom left`}
                    />
                    <button
                      type="button"
                      className="shelf-book-handle front-action-handle handle-se"
                      onPointerDown={(event) => startFrontActionResize(slot, "se", event)}
                      aria-label={`Resize ${label} bottom right`}
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="shelf-book-handle handle-nw"
              onPointerDown={(event) => startFrontResize("nw", event)}
              aria-label="Resize front template top left"
            />
            <button
              type="button"
              className="shelf-book-handle handle-ne"
              onPointerDown={(event) => startFrontResize("ne", event)}
              aria-label="Resize front template top right"
            />
            <button
              type="button"
              className="shelf-book-handle handle-sw"
              onPointerDown={(event) => startFrontResize("sw", event)}
              aria-label="Resize front template bottom left"
            />
            <button
              type="button"
              className="shelf-book-handle handle-se"
              onPointerDown={(event) => startFrontResize("se", event)}
              aria-label="Resize front template bottom right"
            />
          </div>
        )}

        {draft.books.map((book) => {
          const hasVisibleTitle = hasDisplayTitle(book.label);
          if (!editMode && !hasVisibleTitle) {
            return null;
          }

          const isActive = book.key === activeKey;
          const className = `shelf-book shelf-book-${book.spineType}${editMode ? " editable" : ""}${
            isActive ? " active" : ""
          }`;

          if (!editMode) {
            return (
              <div
                key={book.key}
                className={className}
                style={{
                  left: `${book.xPercent}%`,
                  top: `${book.yPercent}%`,
                  width: `${book.widthPercent}%`,
                  height: `${book.heightPercent}%`,
                }}
              >
                <button
                  type="button"
                  className="shelf-book-drag"
                  onClick={() => openCoverPreview(book.key)}
                  aria-label={`View ${book.label || book.key}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    padding: 0,
                    background: "transparent",
                    cursor: "pointer",
                    font: "inherit",
                    zIndex: 1,
                    touchAction: "pan-x",
                  }}
                />
                {hasDisplayTitle(book.label) &&
                  (hasReaderContent(book, "full") ? (
                    <Link
                      href={readerPath(pageKey, book.key, "full")}
                      className="shelf-book-label shelf-book-label-link"
                      style={{
                        fontFamily: fontFamilyFor(book.titleFont),
                        fontSize: `${book.titleSizeVw}vw`,
                        color: titleColorValue(book.titleColor),
                        ["--title-box-x" as string]: `${book.titleBoxXPercent}%`,
                        ["--title-box-y" as string]: `${book.titleBoxYPercent}%`,
                        ["--title-box-w" as string]: `${book.titleBoxWidthPercent}%`,
                        ["--title-box-h" as string]: `${book.titleBoxHeightPercent}%`,
                        zIndex: 3,
                      }}
                      aria-label={`Open full book: ${book.label}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {book.label}
                    </Link>
                  ) : (
                    <span
                      className="shelf-book-label"
                      style={{
                        fontFamily: fontFamilyFor(book.titleFont),
                        fontSize: `${book.titleSizeVw}vw`,
                        color: titleColorValue(book.titleColor),
                        ["--title-box-x" as string]: `${book.titleBoxXPercent}%`,
                        ["--title-box-y" as string]: `${book.titleBoxYPercent}%`,
                        ["--title-box-w" as string]: `${book.titleBoxWidthPercent}%`,
                        ["--title-box-h" as string]: `${book.titleBoxHeightPercent}%`,
                        zIndex: 3,
                      }}
                    >
                      {book.label}
                    </span>
                  ))}
              </div>
            );
          }

          return (
            <div
              key={book.key}
              className={className}
              style={{
                left: `${book.xPercent}%`,
                top: `${book.yPercent}%`,
                width: `${book.widthPercent}%`,
                height: `${book.heightPercent}%`,
              }}
              onMouseDown={() => setActiveKey(book.key)}
            >
              <button
                type="button"
                className="shelf-book-drag"
                onPointerDown={(event) => startMove(book.key, event)}
                aria-label={`Move ${book.label}`}
              >
                <span
                  className="shelf-book-label"
                  style={{
                    fontFamily: fontFamilyFor(book.titleFont),
                    fontSize: `${book.titleSizeVw}vw`,
                    color: titleColorValue(book.titleColor),
                    ["--title-box-x" as string]: `${book.titleBoxXPercent}%`,
                    ["--title-box-y" as string]: `${book.titleBoxYPercent}%`,
                    ["--title-box-w" as string]: `${book.titleBoxWidthPercent}%`,
                    ["--title-box-h" as string]: `${book.titleBoxHeightPercent}%`,
                  }}
                >
                  {hasDisplayTitle(book.label) ? book.label : ""}
                </span>
              </button>

              {isActive && (
                <div
                  className="shelf-book-title-box"
                  style={{
                    left: `${book.titleBoxXPercent}%`,
                    top: `${book.titleBoxYPercent}%`,
                    width: `${book.titleBoxWidthPercent}%`,
                    height: `${book.titleBoxHeightPercent}%`,
                  }}
                  onPointerDown={(event) => startTitleBoxMove(book.key, event)}
                >
                  <button
                    type="button"
                    className="shelf-book-handle handle-nw"
                    onPointerDown={(event) => startTitleBoxResize(book.key, "nw", event)}
                    aria-label={`Resize title area ${book.label || book.key} top left`}
                  />
                  <button
                    type="button"
                    className="shelf-book-handle handle-ne"
                    onPointerDown={(event) => startTitleBoxResize(book.key, "ne", event)}
                    aria-label={`Resize title area ${book.label || book.key} top right`}
                  />
                  <button
                    type="button"
                    className="shelf-book-handle handle-sw"
                    onPointerDown={(event) => startTitleBoxResize(book.key, "sw", event)}
                    aria-label={`Resize title area ${book.label || book.key} bottom left`}
                  />
                  <button
                    type="button"
                    className="shelf-book-handle handle-se"
                    onPointerDown={(event) => startTitleBoxResize(book.key, "se", event)}
                    aria-label={`Resize title area ${book.label || book.key} bottom right`}
                  />
                </div>
              )}

              <button
                type="button"
                className="shelf-book-handle handle-nw"
                onPointerDown={(event) => startResize(book.key, "nw", event)}
                aria-label={`Resize ${book.label} top left`}
              />
              <button
                type="button"
                className="shelf-book-handle handle-ne"
                onPointerDown={(event) => startResize(book.key, "ne", event)}
                aria-label={`Resize ${book.label} top right`}
              />
              <button
                type="button"
                className="shelf-book-handle handle-sw"
                onPointerDown={(event) => startResize(book.key, "sw", event)}
                aria-label={`Resize ${book.label} bottom left`}
              />
              <button
                type="button"
                className="shelf-book-handle handle-se"
                onPointerDown={(event) => startResize(book.key, "se", event)}
                aria-label={`Resize ${book.label} bottom right`}
              />
            </div>
          );
        })}

        {editMode ? (
          <div
            className="bookcase-admin-logo bookcase-admin-logo-edit"
            style={{
              left: `${adminLogoTemplate.xPercent}%`,
              top: `${adminLogoTemplate.yPercent}%`,
              width: `${adminLogoTemplate.widthPercent}%`,
              height: `${adminLogoTemplate.heightPercent}%`,
            }}
            onPointerDown={startAdminLogoMove}
            aria-label="Admin edit logo position"
          >
            <img src="/lradmin.png" alt="Admin logo" draggable={false} />
            <button
              type="button"
              className="shelf-book-handle handle-nw"
              onPointerDown={(event) => startAdminLogoResize("nw", event)}
              aria-label="Resize admin logo top left"
            />
            <button
              type="button"
              className="shelf-book-handle handle-ne"
              onPointerDown={(event) => startAdminLogoResize("ne", event)}
              aria-label="Resize admin logo top right"
            />
            <button
              type="button"
              className="shelf-book-handle handle-sw"
              onPointerDown={(event) => startAdminLogoResize("sw", event)}
              aria-label="Resize admin logo bottom left"
            />
            <button
              type="button"
              className="shelf-book-handle handle-se"
              onPointerDown={(event) => startAdminLogoResize("se", event)}
              aria-label="Resize admin logo bottom right"
            />
          </div>
        ) : isAdmin ? (
          <Link
            href="/bookcase/admin"
            className="bookcase-admin-logo bookcase-admin-logo-link"
            style={{
              left: `${adminLogoTemplate.xPercent}%`,
              top: `${adminLogoTemplate.yPercent}%`,
              width: `${adminLogoTemplate.widthPercent}%`,
              height: `${adminLogoTemplate.heightPercent}%`,
            }}
            aria-label="Open admin edit pages"
          >
            <img src="/lradmin.png" alt="Admin logo" draggable={false} />
          </Link>
        ) : (
          <div
            className="bookcase-admin-logo"
            style={{
              left: `${adminLogoTemplate.xPercent}%`,
              top: `${adminLogoTemplate.yPercent}%`,
              width: `${adminLogoTemplate.widthPercent}%`,
              height: `${adminLogoTemplate.heightPercent}%`,
            }}
            aria-hidden="true"
          >
            <img src="/lradmin.png" alt="" draggable={false} />
          </div>
        )}
      </div>

      {showAddModal && pendingBook && (
        <div className="book-add-overlay" role="dialog" aria-modal="true" aria-label="Add a book title">
          <div className="book-add-modal">
            <h3>Book Preview Settings</h3>

            <label className="bookcase-editor-label">
              Title
              <input
                value={pendingBook.label}
                onChange={(event) =>
                  updateBook(pendingBook.key, { label: event.target.value })
                }
                placeholder="Book title"
                autoFocus
              />
            </label>

            <label className="bookcase-editor-label">
              Font
              <select
                value={pendingBook.titleFont}
                onChange={(event) =>
                  updateBook(pendingBook.key, {
                    titleFont: (event.target.value as BookItem["titleFont"]) || "classic",
                  })
                }
              >
                {TITLE_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="bookcase-editor-label">
              Size (vw)
              <input
                type="number"
                min={1.2}
                max={3.8}
                step={0.1}
                value={pendingBook.titleSizeVw}
                onChange={(event) =>
                  updateBook(pendingBook.key, {
                    titleSizeVw: clamp(Number(event.target.value) || 1.2, 1.2, 3.8),
                  })
                }
              />
            </label>

            <label className="bookcase-editor-label">
              Color
              <select
                value={pendingBook.titleColor}
                onChange={(event) =>
                  updateBook(pendingBook.key, {
                    titleColor: event.target.value === "black" ? "black" : "brown",
                  })
                }
              >
                <option value="brown">Brown</option>
                <option value="black">Black</option>
              </select>
            </label>

            <label className="bookcase-editor-label">
              Spine Template
              <select
                value={pendingBook.spineType}
                onChange={(event) =>
                  updateBook(pendingBook.key, {
                    spineType: event.target.value === "brown" ? "brown" : "gold",
                  })
                }
              >
                <option value="gold">Gold spine</option>
                <option value="brown">Brown spine</option>
              </select>
            </label>

            <label className="bookcase-editor-label">
              Target Path
              <select
                value={pendingBook.targetPath}
                onChange={(event) =>
                  updateBook(pendingBook.key, { targetPath: event.target.value })
                }
              >
                {pendingTargetPathOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="bookcase-editor-actions">
              <button type="button" onClick={confirmAddBook}>
                Done
              </button>
              <button type="button" onClick={cancelAddBook}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddBookcaseModal && (
        <div className="book-add-overlay" role="dialog" aria-modal="true" aria-label="Create a new bookcase">
          <div className="book-add-modal">
            <h3>Create New Bookcase</h3>

            <label className="bookcase-editor-label">
              Bookcase key
              <input
                value={pendingBookcaseKey}
                onChange={(event) => setPendingBookcaseKey(event.target.value)}
                placeholder="example: classics-2"
                autoFocus
              />
            </label>

            <p className="bookcase-editor-hint">
              Preview: this copies positions from <strong>{bookcaseLabelForKey(pageKey)}</strong>, clears all book text/media, and creates a new editable shelf.
            </p>
            <div className="bookcase-create-preview-list">
              {draft.books.map((book) => (
                <p key={book.key} className="bookcase-coords">
                  {book.key} | X {book.xPercent.toFixed(2)}% Y {book.yPercent.toFixed(2)}% | W {book.widthPercent.toFixed(2)}% H {book.heightPercent.toFixed(2)}%
                </p>
              ))}
            </div>

            <div className="bookcase-editor-actions">
              <button type="button" onClick={() => void confirmAddBookcase()} disabled={creatingBookcase}>
                {creatingBookcase ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={cancelAddBookcase} disabled={creatingBookcase}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBookForPreview && selectedPreviewBook && (
        <div
          className="cover-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Book cover preview"
          onClick={closeCoverPreview}
        >
          <button
            type="button"
            className="cover-preview-close"
            onClick={closeCoverPreview}
            aria-label="Close cover preview"
          >
            x
          </button>
          <div
            className="cover-preview-container cover-preview-container-live"
            onClick={(e) => e.stopPropagation()}
            style={{
              left: "50vw",
              top: "50dvh",
              width: `${coverPreviewRect.width}px`,
              height: `${coverPreviewRect.height}px`,
            }}
          >
            <div
              className="cover-preview-stage"
              style={{
                width: `${previewViewport.stageWidthPercent}%`,
                height: `${previewViewport.stageHeightPercent}%`,
                left: `${previewViewport.stageLeftPercent}%`,
                top: `${previewViewport.stageTopPercent}%`,
              }}
            >
              <div
                className={`book-front-frame book-front-frame-${previewFrontType}`}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
              {selectedPreviewBook.coverImageUrl && (
                <div
                  className={`book-front-cover book-front-cover-${previewFrontType}`}
                  style={{
                    backgroundImage: `url(${selectedPreviewBook.coverImageUrl})`,
                    width: `${previewFrontTemplate.coverWindow.widthPercent}%`,
                    height: `${previewFrontTemplate.coverWindow.heightPercent}%`,
                    left: `${previewFrontTemplate.coverWindow.xPercent}%`,
                    top: `${previewFrontTemplate.coverWindow.yPercent}%`,
                    position: "absolute",
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              )}
              {hasReaderContent(selectedPreviewBook, "full") && (
                <Link
                  href={readerPath(pageKey, selectedPreviewBook.key, "full")}
                  aria-label={`Open full book: ${selectedPreviewBook.label || selectedPreviewBook.key}`}
                  style={{
                    position: "absolute",
                    width: `${previewFrontTemplate.coverWindow.widthPercent}%`,
                    height: `${previewFrontTemplate.coverWindow.heightPercent}%`,
                    left: `${previewFrontTemplate.coverWindow.xPercent}%`,
                    top: `${previewFrontTemplate.coverWindow.yPercent}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 2,
                    display: "block",
                  }}
                />
              )}
              {(["sample", "info"] as FrontActionSlot[]).map((slot) => {
                const action = previewFrontTemplate.actionButtons[slot];
                const hasContent = hasReaderContent(selectedPreviewBook, slot);
                const label = slot === "sample" ? "Reader Sample" : "Information Page";
                const logoPath = actionLogoPath(previewFrontType, slot);
                return (
                  <Link
                    key={slot}
                    href={readerPath(pageKey, selectedPreviewBook.key, slot)}
                    className="front-action-badge front-action-badge-preview"
                    style={{
                      left: `${action.xPercent}%`,
                      top: `${action.yPercent}%`,
                      width: `${action.widthPercent}%`,
                      height: `${action.heightPercent}%`,
                    }}
                    onClick={(event) => {
                      if (!hasContent) event.preventDefault();
                    }}
                    aria-disabled={!hasContent}
                    aria-label={label}
                  >
                    <img src={logoPath} alt={label} className="front-action-logo-image" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
