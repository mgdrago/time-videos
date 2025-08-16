import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const CHANNELS = [
  { id: "UCsT0YIqwnpJCM-mx7-gSA4Q", source: "TEDx" },
  { id: "UCKJyv_uNh3LhYFKmwaB63bA", source: "Harvard" },
  { id: "UCHIqMEje_NFJ2u24CVaNQvg", source: "Oxford Saïd" },
  { id: "UCZgwOAjweG6NZKX5VWXLQLw", source: "IIT Madras" },
  { id: "UCT0-V_Z5-MuwN5fpbO-25Ag", source: "AIIMS" },
  { id: "UC3UPXvR5TAVFL18ACyoW0RQ", source: "Author: James Clear" },
  { id: "UCIhJnsJ0IHlVNnYfp-gw_5Q", source: "Author: Cal Newport" },
  { id: "UCc11676iKpKrJMYqNYHqNig", source: "Author: Brian Tracy" },
  { id: "UCRXz_Dh-KJQ1YpIHH-btzTw", source: "FranklinCovey" },
  { id: "UCLv7Gzc3VTO6ggFlXY0sOyw", source: "Harvard University" },
  { id: "UCK8f1CUe8y403u3b0gCINww", source: "University of Oxford" },
  { id: "UCjlMin_D2Bg6mgocPRSAzRw", source: "IIT Bombay Official Channel" },
  { id: "UCJX9RwRoVAEFLWlhrNF3Lqg", source: "IIT Delhi" },
  { id: "UCKJyv_uNh3LhYFKmwaB63bA", source: "Harvard" },
  // For links marked (view-source), add their IDs the same way and append here.
];


const KEYWORDS = [
  "time management","study","schedule","planner","planning",
  "habit","habits","procrastination","productivity"
];

const MAX_MINUTES = 20; // keep videos student-friendly length
const parser = new XMLParser({ ignoreAttributes: false });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url);
  return await res.text();
}

function matches(str="") {
  const s = str.toLowerCase();
  return KEYWORDS.some(k => s.includes(k));
}

// Try to derive a thumbnail and duration via no-API tricks
function buildThumb(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function main() {
  const seen = new Set();
  const all = [];

  for (const c of CHANNELS) {
    try {
      const xml = await getFeed(c.id);
      const json = parser.parse(xml);
      const feed = json.feed || {};
      const entries = Array.isArray(feed.entry) ? feed.entry : (feed.entry ? [feed.entry] : []);

      for (const e of entries) {
        const videoId = e["yt:videoId"];
        if (!videoId || seen.has(videoId)) continue;

        const title = e.title || "";
        if (!matches(title)) continue; // keyword filter

        // NOTE: RSS doesn't include duration; we keep MAX_MINUTES only if we later augment.
        // For now, we accept and keep it simple.

        all.push({
          videoId,
          title,
          channel: feed.author?.name || "",
          source: c.source,
          publishDate: e.published,
          link: e.link?.["@_href"] || `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: buildThumb(videoId)
        });
        seen.add(videoId);
      }
      await sleep(500); // be nice
    } catch (err) {
      console.error("Error channel", c, err.message);
    }
  }

  // Sort newest first, cap to last 200
  all.sort((a,b) => new Date(b.publishDate) - new Date(a.publishDate));
  const trimmed = all.slice(0, 200);

  fs.writeFileSync("videos.json", JSON.stringify(trimmed, null, 2));
  console.log(`Wrote ${trimmed.length} videos.`);
}

await main();
