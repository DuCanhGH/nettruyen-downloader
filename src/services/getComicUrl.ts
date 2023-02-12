import inquirer from "inquirer";
import ora from "ora";

import { FULL_URL_REGEX, URL_REGEX } from "../shared/constants";

export const getComicUrl = async () => {
  const fetchNettruyenURLSpinner = ora({
    text: "Fetching current nettruyen URL...",
    hideCursor: false,
  }).start();

  const currentNettruyenURL = (
    await fetch("https://www.nettruyen.uk").catch(() =>
      Promise.resolve({ url: undefined })
    )
  ).url;

  let comicURL: string | undefined;

  if (currentNettruyenURL) {
    fetchNettruyenURLSpinner.succeed(
      `Fetched current nettruyen URL sucessfully. Your comic link should be relative to ${currentNettruyenURL}.`
    );
    const { relativeComicURL } = await inquirer.prompt<{
      relativeComicURL: string;
    }>({
      type: "input",
      message: "Enter the comic URL: ",
      validate: (value) =>
        URL_REGEX.test(value) ? true : "Invalid URL format",
      name: "relativeComicURL",
    });

    comicURL = new URL(relativeComicURL, currentNettruyenURL).href;
  } else {
    fetchNettruyenURLSpinner.fail(
      "Could not fetch current nettruyen URL. Please use a full link to your comic."
    );
    const { inputComicURL } = await inquirer.prompt<{
      inputComicURL: string;
    }>({
      type: "input",
      message: "Enter the comic URL: ",
      validate: (value) =>
        FULL_URL_REGEX.test(value) ? true : "Invalid URL format",
      name: "inputComicURL",
    });
    comicURL = inputComicURL;
  }

  if (!comicURL) {
    throw new Error("comicURL is undefined.");
  }

  return comicURL;
};
