import axios from "axios";
import inquirer from "inquirer";
import { parse } from "node-html-parser";

import type { ChapterType, ImageType } from "../shared/types.js";
import { urlWithProxy } from "../utils/url.js";
import type { ComicInfo } from "./comic.js";

export const getChapImages = async (url: string): Promise<ImageType[]> => {
  const source = (await axios.get(urlWithProxy(url))).data;

  const dom = parse(source);

  if (!dom.querySelector(".box_doc")) throw new Error("404");

  return Array.from(dom.querySelectorAll(".box_doc img")).map((img) =>
    img.getAttribute("src")?.startsWith("//")
      ? img.getAttribute("src")?.replace("//", "http://")
      : img.getAttribute("src")
  );
};

export const getStartEndChap = async (
  info: ComicInfo
): Promise<{
  startChapter: string;
  endChapter: string;
}> => {
  const { startChapter } = await inquirer.prompt<{
    startChapter: string;
  }>({
    type: "input",
    message: `Choose start chapter (1 - ${info.chapters.length}):`,
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Chapter must not be less than 1";
      if (+value > info.chapters.length)
        return `Chapter number must not be greater than chapters count (maximum: ${info.chapters.length})`;
      return true;
    },
    name: "startChapter",
  });
  const { endChapter } = await inquirer.prompt<{
    endChapter: string;
  }>({
    type: "input",
    message: `Choose end chapter (${startChapter} - ${info.chapters.length}):`,
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Chapter must not be less than 1";
      if (+value > info.chapters.length)
        return `Chapter must not be greater than chapters count (maximum: ${info.chapters.length})`;
      if (+value < +startChapter)
        return "End chapter must not be smaller than start chapter";
      return true;
    },
    name: "endChapter",
  });
  return { startChapter, endChapter };
};

export const getStartEndGroup = async (groups: ChapterType[][]) => {
  const { startGroup } = await inquirer.prompt<{
    startGroup: string;
  }>({
    type: "input",
    message: `Choose start group (1 - ${groups.length}):`,
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Group number must not be less than 1";
      if (+value > groups.length)
        return `Group number must not be more than groups count (maximum: ${groups.length})`;
      return true;
    },
    name: "startGroup",
  });
  const { endGroup } = await inquirer.prompt<{
    endGroup: string;
  }>({
    type: "input",
    message: `Choose end group (${startGroup} - ${groups.length}):`,
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Group number must not be less than 1";
      if (+value > groups.length)
        return `Group number must not be more than chapters count (maximum: ${groups.length})`;
      if (+value < +startGroup)
        return "End group number must not be smaller than start group number";
      return true;
    },
    name: "endGroup",
  });
  return { startGroup, endGroup };
};
