import "./report.scss";
import {
  classMemberData,
  csrfToken,
  DataAccessor,
  eventData,
  eventTypeData,
  homeworkData,
  reloadAllFn,
  subjectData,
  substitutionsData,
  teamsData
} from "../../global/global.js";
import { $navbarToasts } from "../../snippets/navbar/navbar.js";
import { richTextToPlainText } from "../../snippets/richTextarea/richTextarea.js";

$(async () => {
  reloadAllFn.set(async () => {
    homeworkData.reload();
    eventData.reload();
    classMemberData.reload();
    teamsData.reload();
    eventTypeData.reload();
    subjectData.reload();
    substitutionsData.reload();
  });
});

function toggleAttachmentRow($row: JQuery<HTMLElement>): void {
  if ($row.is(".attachment-selected")) {
    $(`#attachments-list [data-type="${$row.attr("data-type")}"][data-id="${$row.attr("data-id")}"]`).remove();
  }
  else {
    $("#attachments-list").append(`
      <li data-type="${$row.attr("data-type")}" data-id="${$row.attr("data-id")}">
        <b>${attachmentOptions.find(a => a.type === $row.attr("data-type"))?.name}: </b>
        ${$row.children(":not(:first)").map(function () {
    return $(this).html();
  }).get().join(" - ")}
      </li>
    `);
  }
  $("#attachments-list-empty").toggle($("#attachments-list").children().length === 0);
  $row.toggleClass("attachment-selected");
  $("#submit").prop("disabled", ! allDataFilled());
}

$(document).on("click", "#attachment-table tbody tr", function () {
  toggleAttachmentRow($(this));
});

$(document).on("keypress", "#attachment-table tbody tr", function (ev) {
  if (ev.key === " " || ev.key === "Enter") {
    toggleAttachmentRow($(this));
  }
});

function allDataFilled(): boolean {
  return ($("#category").val() ?? "") !== "" && $("#description").val() !== "" && ! $("#attachments-list-empty").is(":visible");
}

$("#category, #description, #email").val("");
$("#submit").prop("disabled", true);

$("#category").on("change", function () {
  if (allDataFilled()) {
    $("#submit").prop("disabled", false);
  }
});

$("#description").on("change", function () {
  if (! allDataFilled()) {
    $("#submit").prop("disabled", true);
  }
});

$("#description").on("input", function () {
  if (allDataFilled()) {
    $("#submit").prop("disabled", false);
  }
});

$("#submit").on("click", async function () {
  const data = {
    category: $("#category").val(),
    description: $("#description").val(),
    attachments: $("#attachments-list").children().map(function () {
      return { type: $(this).attr("data-type"), id: $(this).attr("data-id") };
    }).get(),
    email: $("#email").val()
  };
  let hasResponded = false;

  $.ajax({
    url: "/report",
    type: "POST",
    data: JSON.stringify(data),
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#report-success-toast").toast("show");
      $("#category, #description, #email").val("");
      $("#submit").prop("disabled", true);
      $("#attachments-list").empty();
      $("attachments-list-empty").show();
    },
    error: xhr => {
      if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});

const currentSubjectData = await subjectData();
const currentEventTypeData = await eventTypeData();

type AttachmentOption<T> = {
  type: string, name: string, dataSrc: DataAccessor<T[]>, idKey: Extract<keyof T, string>, columns: {
    name: string, get: Extract<keyof T, string> | ((item: T) => string), rich?: boolean
  }[]
}

// eslint-disable-next-line
const attachmentOptions: AttachmentOption<any>[] = [
  {
    type: "homework", name: "Hausaufgabe", dataSrc: homeworkData, idKey: "homeworkId", columns: [
      { name: "Fach", get: h => $.escapeHtml(currentSubjectData.find(s => s.subjectId === h.subjectId)?.subjectNameLong ?? "") },
      { name: "Beschreibung", get: "content", rich: true }
    ]
  },
  {
    type: "event", name: "Ereignis", dataSrc: eventData, idKey: "eventId", columns: [
      { name: "Ereignisart", get: ev => $.escapeHtml(currentEventTypeData.find(eT => eT.eventTypeId === ev.eventTypeId)?.name ?? "") },
      { name: "Name", get: "name" },
      { name: "Beschreibung", get: e => e.description ?? "", rich: true }
    ]
  },
  {
    type: "account", name: "Nutzer", dataSrc: classMemberData, idKey: "accountId", columns: [
      { name: "Name", get: "username" }
    ]
  },
  {
    type: "team", name: "Team", dataSrc: teamsData, idKey: "teamId", columns: [
      { name: "Name", get: "name" }
    ]
  },
  {
    type: "eventType", name: "Ereignisart", dataSrc: eventTypeData, idKey: "eventTypeId", columns: [
      { name: "Name", get: "name" },
      { name: "Farbe", get: eT => `<div class="color-display" style="background:${$.escapeHtml(eT.color)}"></div>` }
    ]
  }
];

const subjectAttachmentOption = {
  type: "subject", name: "Fach", dataSrc: subjectData, idKey: "subjectId", columns: [
    { name: "Fachname", get: "subjectNameLong" },
    { name: "Abkürzung", get: "subjectNameShort" },
    { name: "Lehrkraftname", get: "teacherNameLong" },
    { name: "Kürzel", get: "teacherNameShort" }
  ]
};

if ((await substitutionsData()).data !== "No data") {
  subjectAttachmentOption.columns.push(
    { name: "Fachname (Vertretung)", get: "subjectNameSubstitution" },
    { name: "Lehrkraftname (Vertretung)", get: "teacherNameSubstitution" }
  );
}

attachmentOptions.push(subjectAttachmentOption);

for (const option of attachmentOptions) {
  $("#attach-" + option.type).on("click", async () => {
    $("#attach-modal-label").text(option.name + " anhängen");
    $("#attachment-table thead tr").html(
      "<th><i class=\"fas fa-check\" aria-hidden='true'></i></th>"
      + option.columns.map(c => "<th>" + c.name + "</th>").join("")
    );
    $("#attachment-table tbody").html((await option.dataSrc()).map(d => 
      `<tr tabindex="0" data-type="${option.type}" data-id="${d[option.idKey]}" class="${
        $('#attachments-list [data-type="' + option.type + '"][data-id="' + d[option.idKey] + '"]').length > 0 ? "attachment-selected" : ""
      }">`
      + "<td><i class=\"fas fa-check\" aria-hidden='true'></i></td>"
      + option.columns.map(c => "<td>"
        + (x => c.rich ? richTextToPlainText(x) : x)(
          typeof c.get === "string" ? $.escapeHtml(d[c.get]) : c.get(d)
        )
        + "</td>")
      + "</tr>"
    ).join(""));

    $("#attachment-table tbody tr:last td").addClass("border-bottom-0");
  });
}

$("#attach-class").on("click", () => {
  if ($('#attachments-list [data-type="class"]').length > 0) {
    $('#attachments-list [data-type="class"]').remove();
  }
  else {
    $("#attachments-list").append("<li data-type=\"class\" class=\"fw-bold\">Gesamte Klasse</li>");
  }
  $("#attachments-list-empty").toggle($("#attachments-list").children().length === 0);
  $("#submit").prop("disabled", ! allDataFilled());
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("type") && urlParams.has("id")) {
  $("#attach-modal").removeClass("fade");
  $("#attach-" + urlParams.get("type")).trigger("click");
  setTimeout(() => {
    $(`#attachment-table tr[data-type="${urlParams.get("type")}"][data-id="${urlParams.get("id")}"]`).trigger("click");
  }, 0);
  setTimeout(() => {
    $("#attach-modal").modal("hide").addClass("fade");
  }, 0);
}
