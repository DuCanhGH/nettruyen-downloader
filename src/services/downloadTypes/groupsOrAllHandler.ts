import inquirer from "inquirer";
import { cluster } from "radash";

import type { DownloadTypesType, HandlerReturnType } from "../../shared/types";
import { rangeAtoB } from "../../utils/range";
import { getStartEndGroup } from "../chap";
import type { ComicInfo } from "../comic";

export const groupsOrAllHandler = async (
  info: ComicInfo,
  downloadType: DownloadTypesType
): Promise<HandlerReturnType> => {
  console.log("This script will download the comic into groups of chapters");
  const { groupItemCount } = await inquirer.prompt<{
    groupItemCount: string;
  }>({
    type: "input",
    message: "Group item count:",
    validate: (value) => {
      if (!value || Number.isNaN(value) || !Number.isInteger(+value))
        return "Input must be an integer";
      if (+value < 1) return "Count must not be less than 1";
      if (+value > info.chapters.length)
        return `Count must not be greater than chapters count (maximum: ${info.chapters.length})`;
      return true;
    },
    name: "groupItemCount",
  });
  let groups = cluster(info.chapters, +groupItemCount);
  let groupIndexes: number[] = [];
  switch (downloadType) {
    case "Select groups": {
      const { selectedGroups } = await inquirer.prompt<{
        selectedGroups: string[];
      }>({
        type: "checkbox",
        message: "Select groups",
        choices: groups.map((_, index) => `Group ${index + 1}`),
        validate: (value: string[]) => {
          if (value.length < 1) {
            return "Number of selected groups must not be less than 1";
          }
          return true;
        },
        name: "selectedGroups",
      });
      groups = selectedGroups.map((a) => {
        groupIndexes = [...groupIndexes, +a.split(" ")[1] - 1];
        return groups[+a.split(" ")[1] - 1];
      });
      break;
    }
    case "Download a range of groups": {
      const { startGroup, endGroup } = await getStartEndGroup(groups);
      groupIndexes = rangeAtoB(+startGroup - 1, +endGroup - 1);
      groups = groupIndexes.map((a) => groups[+a]);
      break;
    }
    default: {
      groupIndexes = Array.from({ length: groups.length }, (_v, i) => i);
      break;
    }
  }
  return [groups, groupIndexes];
};
