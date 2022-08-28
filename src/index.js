#! /usr/bin/env node

import inquirer from "inquirer";
import ora from "ora";
import { getComicInfo } from "./services/comic.js";
import { FALLBACK_IMAGE, URL_REGEX } from "./shared/constants.js";
import fs from "fs";
import path from "path";
import { cluster, parallel, retry } from "radash";
import { getChapImages } from "./services/chap.js";
import { md5 } from "./shared/utils.js";
import axios from "axios";
import sharp from "sharp";
import PDFDocument from "pdfkit";

const { comicURL } = await inquirer.prompt({
  type: "input",
  message: "Enter the comic URL: ",
  validate: (value) => (URL_REGEX.test(value) ? true : "Invalid URL format"),
  name: "comicURL",
});

const spinner = ora({ text: "Validating...", hideCursor: false }).start();

const info = await getComicInfo(comicURL).catch(() => {
  spinner.fail("Failed to fetch comic info");
  process.exit(1);
});

spinner.succeed(`Comic title: ${info.title}`);

console.log("\nThe script will download the comic into groups of chapters");

const { groupItemCount } = await inquirer.prompt({
  type: "input",
  message: "Group item count:",
  validate: (value) => {
    if (!value || Number.isNaN(value)) return "Input must be a number";
    if (+value < 1) return "Count must not be less than 1";
    if (+value > info.chapters.length)
      return "Count must not be more than chapters count";
    return true;
  },
  name: "groupItemCount",
});

const { outputFolder } = await inquirer.prompt({
  type: "input",
  message: "Enter the output folder:",
  name: "outputFolder",
});

fs.mkdirSync(path.resolve(process.cwd(), outputFolder), { recursive: true });
fs.mkdirSync(path.resolve(process.cwd(), outputFolder, "images"), {
  recursive: true,
});
fs.mkdirSync(path.resolve(process.cwd(), outputFolder, "output"), {
  recursive: true,
});

const fetchChapSpinner = ora({
  text: "Fetching chapter...",
  hideCursor: false,
}).start();

let images = [];
let fetchedChaptersCount = 0;
await parallel(20, info.chapters, async (chapter) => {
  fetchChapSpinner.text = `Fetching chapter ${++fetchedChaptersCount}`;
  const chapImages = await getChapImages(chapter.url);
  chapter.images = chapImages;
  images.push(...chapImages);
});
fetchChapSpinner.succeed("Fetched all chapters successfully");

const fetchImageSpinner = ora({
  text: "Fetching images...",
  hideCursor: false,
}).start();

let fetchedImageCount = 0;
await parallel(10, images, async (image) => {
  const hashed = md5(image);

  await retry({ times: 10 }, async () => {
    fetchImageSpinner.text = `Fetching images (${++fetchedImageCount}/${
      images.length
    }) ...`;
    if (
      fs.existsSync(
        path.resolve(process.cwd(), outputFolder, "images", `${hashed}.png`)
      )
    )
      return;
    const response = await axios.get(image, {
      responseType: "arraybuffer",
      headers: {
        referer: new URL(comicURL).origin,
        origin: new URL(comicURL).origin,
      },
    });
    let data = response.data;
    if (response.headers["content-type"] !== "image/png") {
      try {
        data = await sharp(response.data).png().toBuffer();
      } catch (error) {
        data = Buffer.from(FALLBACK_IMAGE, "base64");
      }
    }

    await new Promise((res) => {
      fs.writeFile(
        path.resolve(process.cwd(), outputFolder, "images", `${hashed}.png`),
        data,
        res
      );
    });
  });
});

fetchImageSpinner.succeed("Fetched all images successfully");

const groups = cluster(info.chapters, +groupItemCount);

const convertPartSpinner = ora({
  text: "Converting parts...",
  hideCursor: false,
}).start();

for (const [index, group] of groups.entries()) {
  convertPartSpinner.text = `Converting parts (${index + 1}/${
    groups.length
  }) ...`;
  convertPartSpinner.render();

  const images = group.reduce(
    (prev, current) => [...prev, ...current.images],
    []
  );

  let doc;

  for (const image of images) {
    const buffer = fs.readFileSync(
      path.resolve(process.cwd(), outputFolder, "images", `${md5(image)}.png`)
    );

    const metadata = await sharp(buffer).metadata();

    if (typeof doc === "undefined") {
      doc = new PDFDocument({
        size: [metadata.width, metadata.height],
      });
    } else {
      doc.addPage({ size: [metadata.width, metadata.height] });
    }
    doc.image(buffer, 0, 0, { width: metadata.width, height: metadata.height });
  }

  const stream = doc?.pipe(
    fs.createWriteStream(
      path.resolve(
        process.cwd(),
        outputFolder,
        "output",
        `${info.title} Part ${index + 1}.pdf`
      )
    )
  );

  doc?.end();

  await new Promise((res) => {
    stream?.on("finish", res);
  });
}

convertPartSpinner.succeed("Converting to PDF successfully");

console.log(
  `🎉 Congratulations. Your PDF files are at ${path.resolve(
    process.cwd(),
    outputFolder,
    "output"
  )}`
);
