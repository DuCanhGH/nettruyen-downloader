import ora from "ora";
import type { Browser } from "puppeteer";
import { parallel } from "radash";

import { getChapImages } from "../services/chap.js";
import {
  groupsOrAllHandler,
  oneChapterHandler,
  rangeOfChapterHandler,
  rangeOfChapterIntoOneFileHandler,
} from "../services/downloadTypes/index.js";
import type {
  ChapterType,
  DownloadTypesType,
  ImageType,
} from "../shared/types.js";
import type { ComicInfo } from "./comic.js";

export const fetchChapters = async (
  browser: Browser,
  info: ComicInfo,
  downloadType: DownloadTypesType
): Promise<[ChapterType[][], number[], ImageType[]]> => {
  const fetchChapSpinner = ora({
    text: "Fetching chapter...",
    hideCursor: false,
  });

  const images: ImageType[] = [];

  let fetchedChaptersCount = 0;

  let groups: ChapterType[][] = [];
  let groupIndexes: number[] = [];

  switch (downloadType) {
    case "Download all groups":
    case "Select groups":
    case "Download a range of groups":
      [groups, groupIndexes] = await groupsOrAllHandler(info, downloadType);
      break;
    case "Download a chapter":
      [groups, groupIndexes] = await oneChapterHandler(info);
      break;
    case "Download a range of chapters":
      [groups, groupIndexes] = await rangeOfChapterHandler(info);
      break;
    case "Download a range of chapters into one file":
      [groups, groupIndexes] = await rangeOfChapterIntoOneFileHandler(info);
      break;
    default:
      break;
  }

  fetchChapSpinner.start();

  const chapters = ([] as ChapterType[]).concat(...groups);

  await parallel(20, chapters, async (chapter) => {
    fetchChapSpinner.text = `Fetching chapter ${++fetchedChaptersCount}/${
      chapters.length
    }`;
    const chapImages = await getChapImages(browser, chapter.url);
    chapter.images = chapImages;
    images.push(...chapImages);
  });

  fetchChapSpinner.succeed("Fetched all chapters successfully");

  return [groups, groupIndexes, images];
};
