import { $cloneTemplate, bytesToText, clamp, escapeHTML, isStandalone, randomUUID, secondsToDurationInSeconds } from "../../global/global.js";
import { replaceSitePJAX } from "../loadingBar/loadingBar.js";

function parseCSVLine(line: string, acc: string[], inQuotes: boolean): string[] {
  if (line === "") return acc;
  const c = line[0];
  const lr = line.substring(1);
  if (c === "\"") {
    return parseCSVLine(lr, acc, !inQuotes);
  }
  if (!inQuotes && c === ",") {
    acc.push("");
    return parseCSVLine(lr, acc, false);
  }
  acc[acc.length - 1] += c;
  return parseCSVLine(lr, acc, inQuotes);
}

function parseCSV(text: string): string[][] {
  return text.split(/[\n\r]/).map(l => parseCSVLine(l, [""], false));
}

export class FileViewer extends HTMLElement {
  private initialized = false;
  private finalInitialized = false;

  private $mimeOptions!: JQuery<HTMLElement>;
  private $content!: JQuery<HTMLElement>;
  private $plaintext!: JQuery<HTMLElement>;
  private $markdown!: JQuery<HTMLElement>;
  private $csv!: JQuery<HTMLElement>;
  private $png!: JQuery<HTMLElement>;
  private $jpeg!: JQuery<HTMLElement>;
  private $mp3!: JQuery<HTMLElement>;
  private $object!: JQuery<HTMLElement>;

  private readonly uuid = randomUUID();
  private _file: File | null = null;
  private audioGain!: GainNode;

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;

    $(this).append($cloneTemplate("#file-viewer-template", {id: this.uuid}));
    this.$mimeOptions = $(this).find(".file-viewer-type-specific");
    this.$content = $(this).find(".file-viewer-content");
    this.$plaintext = $(this).find(".file-viewer-plaintext");
    this.$markdown = $(this).find(".file-viewer-markdown");
    this.$csv = $(this).find(".file-viewer-csv");
    this.$png = $(this).find(".file-viewer-png");
    this.$jpeg = $(this).find(".file-viewer-jpeg");
    this.$mp3 = $(this).find(".file-viewer-mp3");
    this.$object = $(this).find(".file-viewer-object");

    const ctx = new AudioContext();

    this.setupPlaintext();
    this.setupMarkdown();
    this.setupPng();
    this.setupMp3(ctx);

    this.finalInitialized = true;

    this.renderFileList();
  }

  setupPlaintext(): void {
    $(`#${this.uuid}-type-specific-plaintext-font-proportional`).on("click", () => this.$plaintext.removeClass("monospace"));
    $(`#${this.uuid}-type-specific-plaintext-font-monospace`).on("click", () => this.$plaintext.addClass("monospace"));
  }

  setupMarkdown(): void {
    $(`#${this.uuid}-type-specific-markdown-display-styled`).on("click", () => this.$markdown.removeClass("source"));
    $(`#${this.uuid}-type-specific-markdown-display-source`).on("click", () => this.$markdown.addClass("source"));
  }

  setupPng(): void {
    $(`#${this.uuid}-type-specific-png-bg-transparent`).on("click", () => this.$png.removeClass("checkerboard"));
    $(`#${this.uuid}-type-specific-png-bg-checkerboard`).on("click", () => this.$png.addClass("checkerboard"));

    $(`#${this.uuid}-type-specific-png-render-smooth`).on("click", () => this.$png.removeClass("pixelated"));
    $(`#${this.uuid}-type-specific-png-render-pixelated`).on("click", () => this.$png.addClass("pixelated"));
  }

  setupMp3(ctx: AudioContext): void {
    const setVolume = (volume: number): void => {
      this.audioGain.gain.value = volume;
      $(this).find(".file-viewer-mp3-volume-bar").css("width", volume * 100 + "%");
      $(this).find(".file-viewer-mp3-mute i")
        .toggleClass("fa-volume-xmark", volume === 0)
        .toggleClass("fa-volume", volume > 0 && volume <= 0.80)
        .toggleClass("fa-volume-high", volume > 0.80);
    };

    const $mp3Audio = this.$mp3.find("audio");
    const mp3Audio = $mp3Audio[0] as HTMLAudioElement;
    const source = ctx.createMediaElementSource(mp3Audio);
    this.audioGain = ctx.createGain();
    source.connect(this.audioGain);
    this.audioGain.connect(ctx.destination);
    setVolume(0.8);

    $mp3Audio.on("play", () => $(this).find(".file-viewer-mp3-play i").removeClass("fa-play").addClass("fa-pause"));
    $mp3Audio.on("pause", () => $(this).find(".file-viewer-mp3-play i").removeClass("fa-pause").addClass("fa-play"));
    $mp3Audio.on("timeupdate", () => {
      $(this).find(".file-viewer-mp3-progress-bar").css("width", mp3Audio.currentTime / mp3Audio.duration * 100 + "%");
      $(this).find(".file-viewer-mp3-progress-current-time").text(secondsToDurationInSeconds(mp3Audio.currentTime));
    });

    $(this).find(".file-viewer-mp3-play").on("click", async () =>{
      await ctx.resume();
      if (mp3Audio.paused) mp3Audio.play(); else mp3Audio.pause();
    });
    $(this).find(".file-viewer-mp3-mute").on("click", () => setVolume(this.audioGain.gain.value === 0 ? 0.8 : 0));

    const $progress = $(this).find(".file-viewer-mp3-progress");
    const $progressBar = $(this).find(".file-viewer-mp3-progress-bar");
    let progressStartX = 0;
    let progressDragging = false;
    let wasPlaying = false;
    const getProgressPercentage = (): number => (progressStartX - ($progress.offset()?.left ?? 0)) / ($progress.width() ?? 0);

    $progress.on("pointerdown", ev => {
      progressStartX = ev.clientX ?? 0;
      progressDragging = true;
      wasPlaying = !mp3Audio.paused;
      mp3Audio.pause();
    });
    $progress.on("pointermove", ev => {
      if (!progressDragging) return;
      progressStartX = ev.clientX ?? 0;
      $progressBar.css("width", getProgressPercentage() * 100 + "%");
    });
    $progress.on("pointerup pointercancel", () => {
      if (!progressDragging) return;
      progressDragging = false;
      mp3Audio.currentTime = mp3Audio.duration * getProgressPercentage();
      if (wasPlaying) mp3Audio.play();
    });

    const $volume = $(this).find(".file-viewer-mp3-volume");
    const $volumeBar = $(this).find(".file-viewer-mp3-volume-bar");
    let volumeStartX = 0;
    let volumeDragging = false;
    const getVolumePercentage = (): number => (volumeStartX - ($volume.offset()?.left ?? 0)) / ($volume.width() ?? 0);

    $volume.on("pointerdown", ev => {
      volumeStartX = ev.clientX ?? 0;
      volumeDragging = true;
    });
    $volume.on("pointermove", ev => {
      if (!volumeDragging) return;
      volumeStartX = ev.clientX ?? 0;
      $volumeBar.css("width", getVolumePercentage() * 100 + "%");
      setVolume(clamp(0, getVolumePercentage(), 1));
    });
    $volume.on("pointerup pointercancel", () => {
      volumeDragging = false;
    });
  }

  async renderFileList(): Promise<void> {
    if (! this.finalInitialized) return;
    if (this.file === null) return;
    
    const mime = this.file.type;
    const [mimeName, mimeIcon] = {
      "text/plain": ["Einfacher Text", "far fa-file-lines"],
      "text/markdown": ["Markdown", "fab fa-markdown"],
      "text/csv": ["CSV-Tabelle", "fas fa-file-csv"],
      "image/png": ["PNG-Bild", "far fa-file-image"],
      "image/jpeg": ["JPEG-Bild", "far fa-file-image"],
      "audio/mpeg": ["MP3-Audio", "far fa-file-audio"]
    }[mime] ?? [mime, "far fa-file"];
    $(this).find(".file-viewer-type").find("i").removeClass().addClass("me-1 " + mimeIcon).end().find("span").text(mimeName);
    const name = this.file.name;
    $(this).find(".file-viewer-name").text(name);
    const size = bytesToText(this.file.size);
    $(this).find(".file-viewer-size").text(size);

    this.$content.hide();
    this.$object.hide();
    this.$mimeOptions.hide();
    this.$mimeOptions.find("> *").hide();

    if (mime === "text/plain") {
      const text = await this.file.text();

      $(this).find(".file-viewer-type-specific-plaintext-characters").text([...text].filter(c => !/\p{C}/u.test(c)).length);
      $(this).find(".file-viewer-type-specific-plaintext-words").text(text.split(/\s+/).length);

      $(this).find(".file-viewer-type-specific").show().find(".file-viewer-type-specific-plaintext").show();
      this.$plaintext.text(text).show();
    }
    else if (mime === "text/markdown") {
      const text = await this.file.text();
      let styled = escapeHTML(text);
      styled = styled.replace(/\r\n/g, "\n");
      
      styled = styled.replace(/^ *([*\-_] *){3,}$/gm, "<hr></hr>");
      for (let i = 6; i >= 1; i--) {
        styled = styled.replace(new RegExp(`^#{${i}}(.*)$`, "gm"), `<h${i}>$1</h${i}>`);
      }
      styled = styled.replace(/\*\*(.*?)\*\*|__(.*?)__/g, "<b>$1</b>");
      styled = styled.replace(/\*(.*?)\*|_(.*?)_/g, "<i>$1</i>");
      styled = styled.replace(/~~(.*?)~~/g, "<s>$1</s>");
      styled = styled.replace(/```(\w*)\n(.*?)```/gs, '<pre lang="$1">$2</pre>');
      styled = styled.replace(/`(.*?)`/g, "<code>$1</code>");
      styled = styled.replace(/\[(.*)\]\((.*)\)/g, "<a href=\"$2\">$1</a>");
      styled = styled.replace(/&lt;(.*)?&gt;/g, "<a href=\"$1\">$1</a>");

      const bqOpen = "<blockquote>";
      const bqClose = "</blockquote>";
      styled = styled.replace(/^((&gt;)+)(.*)$/gm, (_, indents, __, content) =>
        bqOpen.repeat(indents.length / 4) + content + bqClose.repeat(indents.length / 4)
      );

      const bqRegex = /<\/blockquote>(\s+)<blockquote>/g;
      while (bqRegex.exec(styled)) styled = styled.replace(bqRegex, "$1");

      // First turn every list line into a <li> element with indentation level and unique UUID
      let maxLevel = 1;
      function replaceWithLi(type: "cl" | "ul" | "ol", spaces: string, content: string, props: string = ""): string {
        const level = Math.floor(spaces.length / 2) + 1;
        maxLevel = Math.max(level, maxLevel);
        const id = randomUUID();
        return `<li type="${type}" level="${level}" id="${id}" ${props}>${content}</li id="${id}">`;
      }
      styled = styled.replace(/^( *)[-*+] \[([ x])\](.*)$/gm, (_, spaces, checked, content) =>
        replaceWithLi("cl", spaces, content, checked === "x" ? "checked" : "")
      );
      styled = styled.replace(/^( *)[-*+] (.*)$/gm, (_, spaces, content) => replaceWithLi("ul", spaces, content));
      styled = styled.replace(/^( *)\d+[.)] (.*)$/gm, (_, spaces, content) => replaceWithLi("ol", spaces, content));
      // Start with the most-indented elements and merge sequences of <li>s or (previously generated) <ul>s of the same level into one <ul>.
      // The UUID is used to correctly find the end (otherwise, the new <ul> would reach until the very last element in a multi-level last)
      for (let i = maxLevel; i > 0; i--) {
        for (const type of ["cl", "ul", "ol"]) {
          styled = styled.replace(
            new RegExp(String.raw`((<(li type="${type}"|${type}) level="${i}" id="(.*)"[\s\S]*</(li|${type}) id="\4">\s*)+)`, "g"),
            (_, content) => {
              const id = randomUUID();
              return `<${type} level="${i - 1}" id="${id}">${content}</${type} id="${id}">`;
            });
        }
      }

      styled = styled.replaceAll("<cl", '<ul class="list-unstyled"');
      styled = styled.replaceAll("</cl", "</ul");
      styled = styled.replaceAll(
        /(<li type="cl" level=".*" id="(.*)"( | checked)>)([\s\S]*<\/li id="\2">)/g,
        '$1<input class="form-check-input me-2" type="checkbox"$3 disabled>$4'
      );

      styled = styled.replace(/ {2}\n|\n\n/g, "<br>");
      // Remove unnecessary <br>s after block elements
      styled = styled.replace(/<\/(h[1-6]|hr|blockquote|pre)><br>/g, "</$1>");
      styled = styled.replace(/<\/(li|ul|ol)[^>]*><br>/g, "</$1>");
      

      $(this).find(".file-viewer-type-specific").show().find(".file-viewer-type-specific-markdown").show();
      this.$markdown.show().find(".file-viewer-markdown-styled").html(styled).end().find(".file-viewer-markdown-source").text(text);

      console.log(this.$markdown);
      this.$markdown.find("a").on("click", ev => {
        ev.preventDefault();
        const url = ev.target.href;
        const absUrl = (/^[a-z]+:\/\//i.test(url) ? "" : "https://") + url;
        try {
          if ((new URL(absUrl)).host === location.host) {
            if (isStandalone) {
              replaceSitePJAX(absUrl);
            }
            else {
              globalThis.open(absUrl, "_blank", "noopener,noreferrer");
            }
            return;
          }
          else throw new Error("External");
        }
        catch {
          $("#file-viewer-unsafe-link").toast("show").find("b").text(url);
          $("#file-viewer-unsafe-link-confirm")
            .off("click")
            .on("click", () => {
              globalThis.open(absUrl, "_blank", "noopener,noreferrer");
            });
        }
      });
    }
    else if (mime === "text/csv") {
      const text = await this.file.text();
      const data = parseCSV(text);

      const columns = data.reduce((max, l) => Math.max(max, l.length), 0);
      $(this).find(".file-viewer-type-specific-csv-columns").text(columns);
      $(this).find(".file-viewer-type-specific-csv-rows").text(data.length);

      $(this).find(".file-viewer-type-specific").show().find(".file-viewer-type-specific-csv").show();
      const $tbody = this.$csv.find("tbody");
      $tbody.empty();
      for (const row of data) {
        const $tr = $("<tr>");
        for (const cell of row) {
          $tr.append($("<td>").text(cell));
        }
        while ($tr.children().length < columns) {
          $tr.append($("<td>"));
        }
        $tbody.append($tr);
      }
      this.$csv.show();
    }
    else if (mime === "image/png") {
      this.$png.on("load", () => {
        $(this).find(".file-viewer-type-specific-png-width").text((this.$png[0] as HTMLImageElement).naturalWidth);
        $(this).find(".file-viewer-type-specific-png-height").text((this.$png[0] as HTMLImageElement).naturalHeight);

        $(this).find(".file-viewer-type-specific").show().find(".file-viewer-type-specific-png").show();
      }).attr("src", URL.createObjectURL(this.file)).show();
    }
    else if (mime === "image/jpeg") {
      this.$jpeg.on("load", () => {
        $(this).find(".file-viewer-type-specific-jpeg-width").text((this.$jpeg[0] as HTMLImageElement).naturalWidth);
        $(this).find(".file-viewer-type-specific-jpeg-height").text((this.$jpeg[0] as HTMLImageElement).naturalHeight);

        $(this).find(".file-viewer-type-specific").show().find(".file-viewer-type-specific-jpeg").show();
      }).attr("src", URL.createObjectURL(this.file)).show();
    }
    else if (mime === "audio/mpeg") {
      this.$mp3.show().find("audio").on("loadedmetadata", () => {
        const mp3Audio = this.$mp3.find("audio")[0] as HTMLAudioElement;
        $(this).find(".file-viewer-mp3-progress-current-time").text("0:00");
        $(this).find(".file-viewer-mp3-progress-duration").text(secondsToDurationInSeconds(mp3Audio.duration));
        mp3Audio.pause();
        $(mp3Audio).trigger("pause");
        mp3Audio.currentTime = 0;
      }).attr("src", URL.createObjectURL(this.file));
    }
    else {
      this.$mimeOptions.hide();
      const $newObj = this.$object.clone().attr("data", URL.createObjectURL(this.file)).attr("type", mime);
      this.$object.replaceWith($newObj);
      this.$object = $newObj;
      this.$object.show();
    }
  }

  get file(): File | null {
    return this._file;
  }

  set file(val: File | null) {
    this._file = val;
    this.renderFileList();
  }
}

customElements.define("file-viewer", FileViewer);
