import { repairJsonInput } from "./lib/json-tools.ts";

const input = `{
  "brand": "Aura"
  "team": {
    "owner": "Design Platform",
    "mode": "review"
    "locales": [
      "zh-CN",
      "en-US"
    ]
  },
  "features": []
}`;

console.log(repairJsonInput(input));
