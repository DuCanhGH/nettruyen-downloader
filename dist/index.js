import inquirer from 'inquirer';
import ora from 'ora';
import axios from 'axios';
import { parse } from 'node-html-parser';
import fs from 'fs';
import path from 'path';
import { parallel, retry, cluster } from 'radash';
import crypto from 'crypto';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';

const urlWithProxy = (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`;

const getComicInfo = async (comicURL) => {
    const source = (await axios.get(urlWithProxy(comicURL))).data;
    const dom = parse(source);
    if (!dom.querySelector("#item-detail .title-detail")?.textContent)
        throw new Error("404");
    const result = {
        title: dom.querySelector("#item-detail .title-detail")?.textContent,
        chapters: Array.from(dom.querySelectorAll(".list-chapter ul li:not(.heading)"))
            .map((li) => {
            const title = li.querySelector(".chapter a")?.textContent;
            const url = li.querySelector(".chapter a")?.getAttribute("href");
            if (!title || !url) {
                throw new Error("404");
            }
            return {
                title,
                url,
                images: []
            };
        })
            .reverse(),
    };
    return result;
};

const URL_REGEX = /^https?:\/\/(www)?\.?nettruyen.+\.((com)|(net))\/truyen-tranh\/.+$/gm;
const FALLBACK_IMAGE = "/9j/4AAQSkZJRgABAQEAYABgAAD//gA+Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2ODApLCBkZWZhdWx0IHF1YWxpdHkK/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgBkAJYAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A+f6KKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK7JPhR43kjV10GQq6hlPnxDIIyP4qJPhT42ijaR9CkCqCxPnxcAf8CoA42iiigAoorTl0C/h8N2+vuifYLi4a2Rt43b1GTx6YoAzKKu6PpV1rmsWml2Sq11dSCKMM20bj6moLu1lsrye0mAEsEjRuAcgMpwf1FAENFFFABRRRQAUVpzaDeweHLbXXEf2G5ne3jIb5t6gE5H0IrMoAKKKc8bxnDoynGcMMcUANooooAKKKKACiitPXNAv/AA7dwW2oIiyT28dygRw3yOMr+NAGZRRRQAUUUUAFFFFABRRWnqWg3uk6fpl7dCMQ6lCZrcq2SVDbTkduRQBmUUUAEkADJPQUAFFK6NGxV1KsOoIwRU+n2U2p6la2FsAZ7qZIYwxwCzEAZP1NAFeirWpafPpOq3mm3QUXFpO8EoU5AdGK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P+xXsP8A0Fq4Or+qa1qGsmzOoXHnGztY7OD5FXZCmdq8AZxk8nn3oA6nwx/yS3x7/wBw/wD9HtVjRxNZfBbWdQ0vel7Lq0VtfSxffS08ssoyOQrScH1wBzXG2usX9lpV/plvPss9Q8v7THsU+Z5bbk5IyME9iPerPh/xPq/he7kuNJuzA0qeXKjIrxyr6MjAg/iOO1ADPD+hXfiLV4rG1Q4J3TTH7kEY+9I56BQMkk16B8Qxp3/C+4xe3Dwab51j5kysVZI/Ljy2RyOO/UVyGr+PNf1nT306We3tbByDJbWNtHbpIR/e2AFvocisrV9Y1HxFqcmoalMbm7dFVnEarlUUKOFAHCqO3agD1vxFpviHWNau76++Guma0ksrvDe2EkoEqZ+UloZAGOMckZ9a4bxlqviQWVtouo6F/YGlxSGWGwitXhjZ8Y3ktlpGxxkk/hXHpLJEcxuyH1U4r0bwlqGo6h8PvF9rrE0txocFkJIHuG3CK83qIhGT0JBbIHb60AJoUt/rHwivtO0ea4XUtH1D7c8Nu7B5LZ02sQBydrAE+gNcR/busf8AQVvv/Ah/8ai03VL7R7+K+027ltbqI5SWJtrCumb4meIXbzXj0hro9bptJtjKfx2f0oA5S6urq7lEl3PNNIFADSuWIHXGT25/Woat6nqd5rOozahqE7T3c53SSMACxxjtx0AqpQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFWtN1K90fUYNQ0+4e3u4G3Ryp1U4x/I1VooA7I/Ee+nPmX2heG724I+aefSo97H1O3AP5Vla94w1rxHDDbXtwiWUBJhs7aJYYIz7IoAz7nJrCooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/Z";

const getChapImages = async (url) => {
    const source = (await axios.get(urlWithProxy(url))).data;
    const dom = parse(source);
    if (!dom.querySelector(".box_doc"))
        throw new Error("404");
    return Array.from(dom.querySelectorAll(".box_doc img")).map((img) => img.getAttribute("src")?.startsWith("//")
        ? img.getAttribute("src")?.replace("//", "http://")
        : img.getAttribute("src"));
};

const md5 = (data) => crypto.createHash("md5").update(data).digest("hex");

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
        if (!value || Number.isNaN(value))
            return "Input must be a number";
        if (+value < 1)
            return "Count must not be less than 1";
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
    if (!image) {
        return;
    }
    const hashed = md5(image);
    await retry({ times: 10 }, async () => {
        fetchImageSpinner.text = `Fetching images (${++fetchedImageCount}/${images.length}) ...`;
        if (fs.existsSync(path.resolve(process.cwd(), outputFolder, "images", `${hashed}.jpg`)))
            return;
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
        }
        catch (error) {
            data = Buffer.from(FALLBACK_IMAGE, "base64");
        }
        await new Promise((res) => {
            fs.writeFile(path.resolve(process.cwd(), outputFolder, "images", `${hashed}.jpg`), data, res);
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
    convertPartSpinner.text = `Converting parts (${index + 1}/${groups.length}) ...`;
    convertPartSpinner.render();
    const images = group.reduce((prev, current) => [...prev, ...current.images], []);
    let doc;
    for (const image of images) {
        if (!image) {
            continue;
        }
        const buffer = fs.readFileSync(path.resolve(process.cwd(), outputFolder, "images", `${md5(image)}.jpg`));
        const metadata = await sharp(buffer).metadata();
        if (typeof doc === "undefined") {
            doc = new PDFDocument({
                size: [metadata.width || 1000, metadata.height || 1000],
            });
        }
        else {
            doc.addPage({ size: [metadata.width || 1000, metadata.height || 1000] });
        }
        doc.image(buffer, 0, 0, { width: metadata.width, height: metadata.height });
    }
    const stream = doc?.pipe(fs.createWriteStream(path.resolve(process.cwd(), outputFolder, "output", `${info.title} Part ${index + 1}.pdf`)));
    doc?.end();
    await new Promise((res) => {
        stream?.on("finish", res);
    });
}
convertPartSpinner.succeed("Converting to PDF successfully");
console.log(`🎉 Congratulations. Your PDF files are at ${path.resolve(process.cwd(), outputFolder, "output")}`);
