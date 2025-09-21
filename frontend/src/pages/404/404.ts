import { reloadAllFn } from "../../global/global.js";
import "./404.scss";

$("#back-link").on("click", () => {
  history.back();
});

$(() => {
  reloadAllFn.set(async () => {
  });
});
