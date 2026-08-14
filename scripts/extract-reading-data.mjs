import { readFile, writeFile, mkdir } from "node:fs/promises";
import { load } from "cheerio";

const sourcePath = process.argv.find((value, index) => index > 1 && value !== "--")
  ?? "/tmp/reading-gallery-index.html";
const outputPath = new URL("../src/data/books.json", import.meta.url);
const source = await readFile(sourcePath, "utf8");
const $ = load(source);

const clean = (value = "") => value.replace(/\s+/g, " ").trim();

function metadataLines(modal) {
  const meta = modal.find(".modal-book-meta").clone();
  meta.find("br").replaceWith("\n");
  return meta
    .text()
    .split("\n")
    .map(clean)
    .filter(Boolean);
}

function metaValue(lines, label) {
  const line = lines.find((item) => item.startsWith(`${label}：`));
  return line ? clean(line.slice(label.length + 1)) : "";
}

const books = [];

$(".bookshelf > .shelf-book").each((_, element) => {
  const shelfBook = $(element);
  const id = shelfBook.attr("data-book-id") ?? "";
  if (!id) return;

  const modal = $(`#modal-${id}`);
  const card = $(".book-card")
    .filter((__, item) => ($(item).attr("onclick") ?? "").includes(`'${id}'`))
    .first();
  const lines = metadataLines(modal);
  const modalBody = modal.find(".modal-body");
  const compactMeta = clean(modal.find(".modal-meta").first().text());
  const compactParts = compactMeta.split("/").map(clean).filter(Boolean);
  const summary = clean(card.find(".book-summary").text()) || clean(modalBody.find("p").first().text());
  const rawDate = shelfBook.attr("data-date") ?? metaValue(lines, "读完时间");
  const finishedAt = rawDate.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
  const cover = shelfBook.attr("data-cover") ?? modal.find(".modal-cover").attr("src") ?? "";

  // Older entries place their note sections directly in `.modal-content`,
  // while newer entries wrap them in `.modal-body`. Support both layouts so
  // an existing full note never falls back to “正在归档”.
  const content = modalBody.length
    ? modalBody.clone()
    : modal.find(".modal-content").first().clone();
  content
    .children(".modal-close, .modal-header, .modal-title, .modal-meta, .modal-date, .modal-tags")
    .remove();
  const tags = modal.find(".modal-tag, .modal-tags .tag")
    .map((__, item) => clean($(item).text()).replace(/^#/, ""))
    .get();

  books.push({
    id,
    title: clean(shelfBook.attr("data-title") ?? modal.find(".modal-book-title").clone().children().remove().end().text()),
    author: metaValue(lines, "作者") || compactParts[0] || "",
    publisher: metaValue(lines, "出版社") || compactParts[1] || "",
    translator: metaValue(lines, "译者") || compactParts[2] || "",
    finishedAt,
    tags: [...new Set(tags)],
    summary,
    contentHtml: content.html()?.trim() ?? "",
    cover: cover ? new URL(cover, "https://cyslay.github.io/reading-gallery/").href : "",
    spine: shelfBook.find("img").attr("src")
      ? new URL(shelfBook.find("img").attr("src"), "https://cyslay.github.io/reading-gallery/").href
      : "",
  });
});

books.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(books, null, 2)}\n`, "utf8");
console.log(`Extracted ${books.length} books to ${outputPath.pathname}`);
