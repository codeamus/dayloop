const fs = require("fs");

const PATH = "app.json";

const raw = fs.readFileSync(PATH, "utf8");
const json = JSON.parse(raw);

json.expo ||= {};
json.expo.ios ||= {};
json.expo.android ||= {};

// iOS
const iosBuild = Number(json.expo.ios.buildNumber ?? "1");
json.expo.ios.buildNumber = String(iosBuild + 1);

// Android
const androidCode = Number(json.expo.android.versionCode ?? 1);
json.expo.android.versionCode = androidCode + 1;

fs.writeFileSync(PATH, JSON.stringify(json, null, 2) + "\n");

console.log(
  `🚀 Build bumped → iOS: ${json.expo.ios.buildNumber}, Android: ${json.expo.android.versionCode}`
);
