import type { DOWNLOAD_TYPES } from "./constants.js";

export type ImageType = string | undefined;

export interface ChapterType {
  title: string;
  url: string;
  images: ImageType[];
}

export type DownloadTypesType = (typeof DOWNLOAD_TYPES)[number];

export type HandlerReturnType = [ChapterType[][], number[]];
