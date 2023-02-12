import inquirer from "inquirer";

import type { HandlerReturnType } from "../../shared/types";
import type { ComicInfo } from "../comic";

export const oneChapterHandler = async (
  info: ComicInfo
): Promise<HandlerReturnType> => {
  console.log("This script will download a chapter from the comic");
  const { chapter } = await inquirer.prompt<{ chapter: number }>({
    type: "input",
    message: `Choose a chapter (1 - ${info.chapters.length}):`,
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Chapter must not be less than 1";
      if (+value > info.chapters.length)
        return `Chapter number must not be greater than chapters count (maximum: ${info.chapters.length})`;
      return true;
    },
    name: "chapter",
  });
  const groups = [[info.chapters[chapter - 1]]];
  const groupIndexes = [chapter - 1];
  return [groups, groupIndexes];
};
