import axios from "axios";
import fs from "fs";
import ora from "ora";
import path from "path";
import { parallel, retry } from "radash";
import sharp from "sharp";

import { FALLBACK_IMAGE } from "../shared/constants.js";
import type { ImageType } from "../shared/types.js";
import { md5 } from "../utils/hash.js";

export const fetchImages = async (
  images: ImageType[],
  outputFolder: string,
  comicURL: string
) => {
  const fetchImageSpinner = ora({
    text: "Fetching images...",
    hideCursor: false,
  }).start();

  let fetchedImageCount = 0;

  await parallel(10, images, async (image) => {
    if (!image) {
      return;
    }

    const hashed = md5(image);

    await retry({ times: 10 }, async () => {
      fetchImageSpinner.text = `Fetching images (${fetchedImageCount}/${images.length}) ...`;
      if (
        fs.existsSync(
          path.resolve(process.cwd(), outputFolder, "images", `${hashed}.jpg`)
        )
      ) {
        return;
      }

      const response = await axios.get(image, {
        responseType: "arraybuffer",
        headers: {
          referer: new URL(comicURL).origin,
          origin: new URL(comicURL).origin,
        },
      });

      let data = response.data;

      try {
        data = await sharp(response.data).jpeg({ quality: 60 }).toBuffer();
      } catch (error) {
        data = Buffer.from(FALLBACK_IMAGE, "base64");
      }

      await new Promise((res) => {
        fs.writeFile(
          path.resolve(process.cwd(), outputFolder, "images", `${hashed}.jpg`),
          data,
          res
        );
      });
    });
    fetchedImageCount++;
  });

  fetchImageSpinner.succeed("Fetched all images successfully");
};
