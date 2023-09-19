import fs from "fs";
import inquirer from "inquirer";
import ora from "ora";
import path from "path";
import { executablePath } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

import { getComicInfo } from "./services/comic.js";
import { fetchChapters } from "./services/fetchChapters.js";
import { fetchImages } from "./services/fetchImages.js";
import { getComicUrl } from "./services/getComicUrl.js";
import { writeOutput } from "./services/writeOutput.js";
import { DOWNLOAD_TYPES } from "./shared/constants.js";
import type { DownloadTypesType } from "./shared/types.js";

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  executablePath: executablePath(),
  headless: "new",
});

const comicURL = await getComicUrl();

const spinner = ora({ text: "Validating...", hideCursor: false }).start();

const info = await getComicInfo(browser, comicURL).catch(() => {
  spinner.fail("Failed to fetch comic info");
  process.exit(1);
});

spinner.succeed(`Comic title: ${info.title}`);

const { downloadType } = await inquirer.prompt<{
  downloadType: DownloadTypesType;
}>({
  type: "list",
  message: "Choose download type:",
  choices: DOWNLOAD_TYPES,
  name: "downloadType",
});

const { outputFolder } = await inquirer.prompt<{
  outputFolder: string;
}>({
  type: "input",
  message: "Enter the output folder:",
  name: "outputFolder",
  validate: (value) => {
    if (fs.existsSync(path.resolve(process.cwd(), value)))
      return "This folder already exists";
    return true;
  },
});

fs.mkdirSync(path.resolve(process.cwd(), outputFolder), { recursive: true });

fs.mkdirSync(path.resolve(process.cwd(), outputFolder, "images"), {
  recursive: true,
});

fs.mkdirSync(path.resolve(process.cwd(), outputFolder, "output"), {
  recursive: true,
});

const [groups, groupIndexes, images] = await fetchChapters(
  browser,
  info,
  downloadType
);

await fetchImages(images, outputFolder, comicURL);

await writeOutput(groups, groupIndexes, outputFolder, info.title, downloadType);

await browser.close();
