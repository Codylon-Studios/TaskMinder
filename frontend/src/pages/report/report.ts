import { csrfToken, DataAccessor, EventData, eventData, eventTypeData, homeworkData, HomeworkData, joinedTeamsData, lessonData, reloadAllFn, subjectData, teamsData } from "../../global/global.js";
import { authUser, $navbarToasts } from "../../snippets/navbar/navbar.js";
import { richTextToPlainText } from "../../snippets/richTextarea/richTextarea.js";

$(async () => {
  reloadAllFn.set(async () => {
    subjectData.reload();

    eventData.reload();
    homeworkData.reload();
    eventTypeData.reload();
    joinedTeamsData.reload();
    teamsData.reload();
    lessonData.reload();
  });
});

function toggleAttachmentRow($row: JQuery<HTMLElement>): void {
  if ($row.is(".attachment-selected")) {
    $(`#attachments-list [data-type="${$row.attr("data-type")}"][data-id="${$row.attr("data-id")}"]`).remove();
  }
  else {
    $("#attachments-list").append(`
      <li data-type="${$row.attr("data-type")}" data-id="${$row.attr("data-id")}">
        <b>${attachmentOptions.find(a => a.type === $row.attr("data-type"))?.name}</b>
        ${$row.children().map(function () {
    return $(this).text();
  }).get().join(" - ")}
      </li>
    `);
  }
  $("#attachments-list-empty").toggle($("#attachments-list").children().length === 0);
  $row.toggleClass("attachment-selected");
  $("#submit").prop("disabled", ! allDataFilled())
}

$(document).on("click", "#attachment-table tbody tr", function () {
  toggleAttachmentRow($(this));
});

$(document).on("keypress", "#attachment-table tbody tr", function (ev) {
  if (ev.key === " " || ev.key === "Enter") {
    toggleAttachmentRow($(this));
  }
});

function allDataFilled() {
  return ($("#category").val() ?? "") !== "" && $("#description").val() !== "" && ! $("#attachments-list-empty").is(":visible")
}

$("#category, #description, #email").val("")
$("#submit").prop("disabled", true)

$("#category").on("change", function () {
  if (allDataFilled()) {
    $("#submit").prop("disabled", false)
  }
})

$("#description").on("change", function () {
  if (! allDataFilled()) {
    $("#submit").prop("disabled", true)
  }
})

$("#description").on("input", function () {
  if (allDataFilled()) {
    $("#submit").prop("disabled", false)
  }
})

$("#submit").on("click", async function () {
  const data = {
    category: $("#category").val(),
    description: $("#description").val(),
    attachments: $("#attachments-list").children().map(function () {
      return { type: $(this).attr("data-type"), id: $(this).attr("data-id") }
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
      $("#category, #description, #email").val("")
      $("#attachments-list").empty()
      $("attachments-list-empty").show()
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
})

const currentSubjectData = await subjectData();
const currentEventTypeData = await eventTypeData();

type AttachmentOption<T> = {
  type: string, name: string, dataSrc: DataAccessor<T[]>, columns: {
    name: string, get: Extract<keyof T, string> | ((item: T) => string | undefined), rich?: boolean
  }[]
}

// eslint-disable-next-line
const attachmentOptions: AttachmentOption<any>[] = [
  {
    type: "homework", name: "Hausaufgabe", dataSrc: homeworkData, columns: [
      { name: "Fach", get: (h: HomeworkData[number]) => currentSubjectData.find(s => s.subjectId === h.subjectId)?.subjectNameLong },
      { name: "Beschreibung", get: "content", rich: true }
    ]
  },
  {
    type: "event", name: "Ereignis", dataSrc: eventData, columns: [
      { name: "Ereignisart", get: (h: EventData[number]) => currentEventTypeData.find(e => e.eventTypeId === h.eventTypeId)?.name },
      { name: "Name", get: "name" },
      { name: "Beschreibung", get: "description", rich: true }
    ]
  }
];

for (const option of attachmentOptions) {
  $("#attach-" + option.type).on("click", async () => {
    $("#attach-modal-label").text(option.name + " anhängen");
    $("#attachment-table thead tr").html(
      "<th><i class=\"fas fa-check\" aria-hidden='true'></i></th>"
      + option.columns.map(c => "<th>" + c.name + "</th>").join("")
    );
    $("#attachment-table tbody").html((await option.dataSrc()).map(d => 
      `<tr tabindex="0" data-type="${option.type}" data-id="${d[option.type + "Id"]}" class="${
        $('#attachments-list [data-type="' + option.type + '"][data-id="' + d[option.type + "Id"] + '"]').length > 0 ? "attachment-selected" : ""
      }">`
      + "<td><i class=\"fas fa-check\" aria-hidden='true'></i></td>"
      + option.columns.map(c => "<td>" + (x => c.rich ? richTextToPlainText(x) : x)(typeof c.get === "string" ? d[c.get] : c.get(d)) + "</td>")
      + "</tr>"
    ).join(""));

    $("#attachment-table tbody tr:last td").addClass("border-bottom-0");
  });
}
