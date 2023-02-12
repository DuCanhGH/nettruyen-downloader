import fs from "fs";
import ora from "ora";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

import type {
  ChapterType,
  DownloadTypesType,
  ImageType,
} from "../shared/types";
import { md5 } from "../utils/hash.js";

const getFileName = (
  comicTitle: string,
  groupIndexes: number[],
  downloadType: DownloadTypesType,
  currentPartIndex: number
) => {
  const chapOrPart = () => {
    switch (downloadType) {
      case "Download a chapter":
      case "Download a range of chapters":
      case "Download a range of chapters into one file":
        return "Chap";
      default:
        return "Part";
    }
  };
  const getNumberRange = () => {
    switch (downloadType) {
      case "Download a range of chapters into one file":
        return `${groupIndexes[0] + 1} - ${
          groupIndexes[groupIndexes.length - 1] + 1
        }`;
      default:
        return `${groupIndexes[currentPartIndex] + 1}`;
    }
  };
  return `${comicTitle} ${chapOrPart()} ${getNumberRange()}`;
};

export const writeOutput = async (
  groups: ChapterType[][],
  groupIndexes: number[],
  outputFolder: string,
  comicTitle: string | undefined = "Unknown comic",
  downloadType: DownloadTypesType
) => {
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
      [] as ImageType[]
    );

    let doc;

    for (const image of images) {
      if (!image) {
        continue;
      }

      const buffer = fs.readFileSync(
        path.resolve(process.cwd(), outputFolder, "images", `${md5(image)}.jpg`)
      );

      const metadata = await sharp(buffer).metadata();

      if (typeof doc === "undefined") {
        doc = new PDFDocument({
          size: [metadata.width || 1000, metadata.height || 1000],
        });
      } else {
        doc.addPage({
          size: [metadata.width || 1000, metadata.height || 1000],
        });
      }

      doc.image(buffer, 0, 0, {
        width: metadata.width,
        height: metadata.height,
      });
    }

    const stream = doc?.pipe(
      fs.createWriteStream(
        path.resolve(
          process.cwd(),
          outputFolder,
          "output",
          `${getFileName(comicTitle, groupIndexes, downloadType, index)}.pdf`
        )
      )
    );

    doc?.end();

    await new Promise((res) => {
      stream?.on("finish", res);
    });
  }

  convertPartSpinner.succeed("Converted to PDF successfully");

  console.log(
    `🎉 Congratulations! Your PDF files are at ${path.resolve(
      process.cwd(),
      outputFolder,
      "output"
    )}`
  );
};
