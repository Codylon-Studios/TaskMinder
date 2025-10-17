export async function init(): Promise<void> {
  return new Promise(res => {
    $("#back-link").on("click", ev => {
      ev.preventDefault();
      history.back();
    });

    res()
  })
}
