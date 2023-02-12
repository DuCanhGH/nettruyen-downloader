import type { ChapterType, HandlerReturnType } from "../../shared/types";
import { rangeAtoB } from "../../utils/range";
import { getStartEndChap } from "../chap";
import type { ComicInfo } from "../comic";

export const rangeOfChapterHandler = async (
  info: ComicInfo
): Promise<HandlerReturnType> => {
  console.log("This script will download a range of chapters from the comic");
  const { startChapter, endChapter } = await getStartEndChap(info);
  const groupIndexes = rangeAtoB(+startChapter - 1, +endChapter - 1);
  const groups = [];
  for (const i of groupIndexes) {
    groups.push([info.chapters[i]]);
  }
  return [groups, groupIndexes];
};

export const rangeOfChapterIntoOneFileHandler = async (
  info: ComicInfo
): Promise<HandlerReturnType> => {
  console.log(
    "This script will download a range of chapters from the comic into one file"
  );
  const { startChapter, endChapter } = await getStartEndChap(info);
  const groupIndexes = rangeAtoB(+startChapter - 1, +endChapter - 1);
  const groups = [];
  const group: ChapterType[] = [];
  for (const i of groupIndexes) {
    group.push(info.chapters[i]);
  }
  groups.push(group);
  return [groups, groupIndexes];
};
