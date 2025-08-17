import { reloadAllFn } from "../../global/global.js";

$("#back-link").on("click", () => {
  history.back();
});

$(() => {
  reloadAllFn.set(async () => {
  });
});
