import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import inquirer from "inquirer";

import type { ChapterType, ImageType } from "../shared/types.js";
import type { ComicInfo } from "./comic.js";

export const getChapImages = async (url: string): Promise<ImageType[]> => {
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    executablePath: executablePath(),
  });
  const page = await browser.newPage();
  await page.goto(url);
  const imgBox = await page.evaluate(() => document.querySelector(".box_doc"));
  if (!imgBox) throw new Error("404");
  const images = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".box_doc img")).map((img) => {
      const imgSrc = img.getAttribute("src");
      if (imgSrc === null) {
        return undefined;
      }
      return imgSrc?.startsWith("//")
        ? imgSrc?.replace("//", "http://")
        : imgSrc;
    })
  );
  await browser.close();
  return images;
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
