import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import type { ChapterType, ImageType } from "../shared/types.js";

export interface ComicInfo {
  title: string | undefined;
  chapters: ChapterType[];
}

export const getComicInfo = async (comicURL: string): Promise<ComicInfo> => {
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    executablePath: executablePath(),
  });
  const page = await browser.newPage();
  await page.goto(comicURL);
  const title = await page.evaluate(
    () => document.querySelector("#item-detail .title-detail")?.textContent
  );
  if (!title) {
    throw new Error("404");
  }
  const chapters = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".list-chapter ul li:not(.heading)"))
      .map((li) => {
        const title = li.querySelector(".chapter a")?.textContent;
        const url = li.querySelector(".chapter a")?.getAttribute("href");
        if (!title || !url) {
          throw new Error("404");
        }
        return {
          title,
          url,
          images: [] as ImageType[],
        };
      })
      .reverse()
  );
  const result = {
    title,
    chapters,
  };
  await browser.close();
  return result;
};
