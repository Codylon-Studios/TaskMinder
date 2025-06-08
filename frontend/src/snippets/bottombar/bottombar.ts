const availableLinks = [
  "/about",
  "/homework",
  "/main",
  "/events",
  "/settings"
]
const siteIndex = availableLinks.indexOf(location.pathname.replace(/\/$/, "")) ?? -1

$(".bottombar-link").eq(siteIndex).addClass("bottombar-current-link")
$(".bottombar-link").each(function (id) {
  $(this).on("click", () => {
    location.href = availableLinks[id]
  })
})
